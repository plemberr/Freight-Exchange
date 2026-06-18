from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.listing import Listing
from app.db.models.cargo import Cargo
from app.db.models.transport import Transport
from app.db.models.point import Point
from app.db.models.route import Route
from app.db.models.route_waypoint import RouteWaypoint

from app.db.enums.listing import ListingStatus, ListingType

from app.repositories.listing_repository import ListingRepository

from app.schemas.listing import (
    CreateListingRequest,
    UpdateListingRequest
)
from app.schemas.cargo import CargoRequest
from app.schemas.transport import TransportRequest

from app.kafka.kafka_producer import send_event
from app.kafka.topics import (
    LISTING_CREATED_TOPIC,
    LISTING_SENT_TO_MODERATION_TOPIC,
    LISTING_DELETED_TOPIC,
)

from app.clients.cargo_client import CargoClient
from app.clients.route_client import RouteClient


def _apply_partial_update(target, source_model) -> None:
    """
    Copies the fields that were actually set on a partial-update Pydantic
    schema (e.g. TransportRequest/CargoRequest used inside
    UpdateListingRequest) onto an ORM object.

    Pydantic field names are camelCase (transportType, maxWeight...) while
    the ORM/DB attributes are snake_case (transport_type, max_weight...).
    Each field's validation_alias already holds the correct snake_case
    name (see app/schemas/transport.py and app/schemas/cargo.py), so we
    reuse it here instead of hand-mapping individual fields again -
    hand-mapping is exactly what caused maxWeight/maxVolume to silently
    not persist before, since only transportType/cargoType were mapped.
    """
    fields = type(source_model).model_fields

    for field_name, value in source_model.model_dump(exclude_unset=True).items():
        alias = fields[field_name].validation_alias
        attr_name = alias if isinstance(alias, str) else field_name
        setattr(target, attr_name, value)


def _serialize_point(point) -> dict | None:
    if point is None:
        return None

    return {
        "city": point.city,
        "country": point.country,
        "latitude": point.latitude,
        "longitude": point.longitude,
    }


def _serialize_route(route) -> dict | None:
    if route is None:
        return None

    waypoints = sorted(route.waypoints, key=lambda wp: wp.order_index)

    return {
        "origin": _serialize_point(route.origin),
        "destination": _serialize_point(route.destination),
        "waypoints": [_serialize_point(wp.point) for wp in waypoints],
        "distanceKm": route.distance_km,
    }


def _build_moderation_event(listing) -> dict:
    """
    Builds the payload for the `listing.sent_to_moderation` Kafka event.

    moderation-service's ListingSentToModerationEvent (and the
    ModerationQueueItem it gets persisted into) expects cargo/transport/
    route alongside the basic fields. Without them the moderation queue
    item ends up with cargo=transport=route=null - that's exactly the
    "truncated" listing showing up in the moderation queue, since
    moderation-service stores whatever this event carries instead of
    fetching the listing back from listing-service.

    CargoRequest/TransportRequest already know how to read the
    camelCase fields off the snake_case ORM columns via validation_alias
    (see app/schemas/cargo.py and app/schemas/transport.py), so they're
    reused here instead of hand-mapping fields again. Route/waypoints
    are mapped by hand because `route.waypoints` is a list of
    RouteWaypoint join-rows (ordered by order_index, each wrapping a
    Point in `.point`), not a list of Point itself.
    """
    return {
        "listingId": str(listing.id),
        "ownerId": str(listing.owner_id),
        "title": listing.title,
        "description": listing.description,
        "type": listing.type.value,
        "cargo": (
            CargoRequest.model_validate(listing.cargo).model_dump()
            if listing.cargo else None
        ),
        "transport": (
            TransportRequest.model_validate(listing.transport).model_dump()
            if listing.transport else None
        ),
        "route": _serialize_route(listing.route),
    }


class ListingService:

    def __init__(self):
        self.listing_repo = ListingRepository()
        self.cargo_client = CargoClient()
        self.route_client = RouteClient()

    # =========================================================
    # CREATE
    # =========================================================
    async def create_listing(
        self,
        db: Session,
        user_id: str,
        data: CreateListingRequest
    ):
        try:

            # -------------------------
            # VALIDATION
            # -------------------------
            if data.type == ListingType.CARGO and not data.cargo:
                raise HTTPException(400, "Cargo data required")

            if data.type == ListingType.TRANSPORT and data.cargo:
                raise HTTPException(400, "Transport listing cannot contain cargo")

            if data.cargo and data.cargo.price is not None and data.cargo.price < 0:
                raise HTTPException(400, "Price must be >= 0")

            # -------------------------
            # LISTING
            # -------------------------
            listing = Listing(
                owner_id=user_id,
                type=data.type,
                title=data.title,
                description=data.description,
                status=ListingStatus.DRAFT
            )

            db.add(listing)
            db.flush()  # get listing.id

            # -------------------------
            # ROUTE
            # -------------------------
            origin = Point(**data.route.origin.model_dump())
            destination = Point(**data.route.destination.model_dump())

            db.add_all([origin, destination])
            db.flush()

            route_data = await self.route_client.calculate_route(
                origin=data.route.origin.model_dump(),
                destination=data.route.destination.model_dump(),
                waypoints=[w.model_dump() for w in data.route.waypoints]
            )

            route = Route(
                listing_id=listing.id,
                origin_id=origin.id,
                destination_id=destination.id,
                distance_km=route_data["distanceKm"]
            )

            db.add(route)
            db.flush()

            # waypoints
            for idx, wp in enumerate(data.route.waypoints):
                point = Point(**wp.model_dump())
                db.add(point)
                db.flush()

                db.add(RouteWaypoint(
                    route_id=route.id,
                    point_id=point.id,
                    order_index=idx
                ))

            # -------------------------
            # CARGO (ORM ATTACH)
            # -------------------------
            if data.cargo:
                volume = await self.cargo_client.calculate_volume(
                    data.cargo.length,
                    data.cargo.width,
                    data.cargo.height
                )

                listing.cargo = Cargo(
                    cargo_type=data.cargo.cargoType,
                    weight=data.cargo.weight,
                    volume=volume,
                    length=data.cargo.length,
                    width=data.cargo.width,
                    height=data.cargo.height,
                    price=data.cargo.price
                )

            # -------------------------
            # TRANSPORT (FIXED)
            # -------------------------
            if data.transport:
                listing.transport = Transport(
                    transport_type=data.transport.transportType,
                    max_weight=data.transport.maxWeight,
                    max_volume=data.transport.maxVolume
                )

            db.commit()
            db.refresh(listing)

            await send_event(
                LISTING_CREATED_TOPIC,
                {
                    "listingId": str(listing.id),
                    "ownerId": str(listing.owner_id),
                    "type": listing.type.value,
                    "status": listing.status.value
                }
            )

            return listing

        except Exception:
            db.rollback()
            raise

    # =========================================================
    # DELETE
    # =========================================================
    async def delete_listing(
        self,
        db: Session,
        listing_id: str,
        user_id: str
    ):
        listing = self.listing_repo.get_by_id(db, listing_id)

        if not listing:
            raise HTTPException(404, "Listing not found")

        if str(listing.owner_id) != str(user_id):
            raise HTTPException(403, "Forbidden")

        try:
            await send_event(
                LISTING_DELETED_TOPIC,
                {"listingId": str(listing.id)}
            )

            db.delete(listing)
            db.commit()

            return {"status": "deleted", "id": listing_id}

        except Exception:
            db.rollback()
            raise

    # =========================================================
    # GET
    # =========================================================
    def get_listing(self, db: Session, listing_id: str, user_id: str | None = None):
        listing = self.listing_repo.get_by_id(db, listing_id)

        if not listing:
            raise HTTPException(404, "Listing not found")

        if listing.status == ListingStatus.ACTIVE:
            return listing

        if not user_id or str(listing.owner_id) != str(user_id):
            raise HTTPException(403, "Forbidden")

        return listing

    # =========================================================
    # MY LISTINGS
    # =========================================================
    def get_my_listings(self, db: Session, user_id: str, status: str | None = None):
        listings = self.listing_repo.get_by_owner(db, user_id)

        if status:
            return [l for l in listings if l.status.value == status]

        return listings

    # =========================================================
    # UPDATE
    # =========================================================
    async def update_listing(
        self,
        db: Session,
        listing_id: str,
        user_id: str,
        data: UpdateListingRequest
    ):
        listing = self.listing_repo.get_by_id(db, listing_id)

        if not listing:
            raise HTTPException(404, "Listing not found")

        if str(listing.owner_id) != str(user_id):
            raise HTTPException(403, "Forbidden")

        if data.title is not None:
            listing.title = data.title

        if data.description is not None:
            listing.description = data.description

        # -------------------------
        # CARGO
        # -------------------------
        if data.cargo:
            if listing.type != ListingType.CARGO:
                raise HTTPException(400, "Only cargo listings can contain cargo data")

            if not listing.cargo:
                listing.cargo = Cargo()

            _apply_partial_update(listing.cargo, data.cargo)

            if all([
                listing.cargo.length,
                listing.cargo.width,
                listing.cargo.height
            ]):
                listing.cargo.volume = await self.cargo_client.calculate_volume(
                    listing.cargo.length,
                    listing.cargo.width,
                    listing.cargo.height
                )

        # -------------------------
        # TRANSPORT
        # -------------------------
        if data.transport:
            if not listing.transport:
                listing.transport = Transport()

            _apply_partial_update(listing.transport, data.transport)

        # -------------------------
        # MODERATION
        # -------------------------
        should_resend = listing.status in (
            ListingStatus.MODERATION,
            ListingStatus.ACTIVE
        )

        if should_resend:
            listing.status = ListingStatus.MODERATION

        db.commit()
        listing = self.listing_repo.get_by_id(db, listing.id)

        if should_resend:
            await send_event(
                LISTING_SENT_TO_MODERATION_TOPIC,
                _build_moderation_event(listing)
            )

        return listing

    # =========================================================
    # SEND TO MODERATION
    # =========================================================
    async def send_to_moderation(self, db: Session, listing_id: str, user_id: str):
        listing = self.listing_repo.get_by_id(db, listing_id)

        if not listing:
            raise HTTPException(404, "Listing not found")

        if str(listing.owner_id) != str(user_id):
            raise HTTPException(403, "Forbidden")

        listing.status = ListingStatus.MODERATION
        db.commit()
        db.refresh(listing)

        await send_event(
            LISTING_SENT_TO_MODERATION_TOPIC,
            _build_moderation_event(listing)
        )

        return listing