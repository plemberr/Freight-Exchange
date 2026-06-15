from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.listing import Listing
from app.db.models.cargo import Cargo
from app.db.models.transport import Transport
from app.db.models.point import Point
from app.db.models.route import Route
from app.db.models.route_waypoint import RouteWaypoint

from app.db.enums.listing import (
    ListingStatus,
    ListingType
)

from app.repositories.listing_repository import ListingRepository
from app.repositories.cargo_repository import CargoRepository
from app.repositories.transport_repository import TransportRepository
from app.repositories.point_repository import PointRepository
from app.repositories.route_repository import RouteRepository

from app.schemas.listing import (
    CreateListingRequest,
    UpdateListingRequest
)

from app.kafka.kafka_producer import send_event
from app.kafka.topics import (
    LISTING_CREATED_TOPIC,
    LISTING_SENT_TO_MODERATION_TOPIC,
    LISTING_DELETED_TOPIC,
)

from app.clients.cargo_client import CargoClient
from app.clients.route_client import RouteClient


class ListingService:

    def __init__(self):
        self.listing_repo = ListingRepository()
        self.cargo_repo = CargoRepository()
        self.transport_repo = TransportRepository()
        self.point_repo = PointRepository()
        self.route_repo = RouteRepository()

        self.cargo_client = CargoClient()
        self.route_client = RouteClient()

    async def create_listing(
        self,
        db: Session,
        user_id: str,
        data: CreateListingRequest
    ):

        try:

            # =========================
            # VALIDATION
            # =========================
            if data.type == ListingType.CARGO:

                if not data.cargo:
                    raise HTTPException(
                        400,
                        "Cargo data required"
                    )

                if (
                    data.cargo.price is not None
                    and data.cargo.price < 0
                ):
                    raise HTTPException(
                        400,
                        "Price must be >= 0"
                    )

            if data.type == ListingType.TRANSPORT:

                if data.cargo:
                    raise HTTPException(
                        400,
                        "Transport listing cannot contain cargo"
                    )

            # =========================
            # LISTING
            # =========================
            listing = Listing(
                owner_id=user_id,
                type=data.type,
                title=data.title,
                description=data.description,
                status=ListingStatus.DRAFT
            )

            self.listing_repo.create(db, listing)

            # =========================
            # ROUTE
            # =========================
            origin = self.point_repo.create(
                db,
                Point(**data.route.origin.model_dump())
            )

            destination = self.point_repo.create(
                db,
                Point(**data.route.destination.model_dump())
            )

            route_data = await self.route_client.calculate_route(
                origin=data.route.origin.model_dump(),
                destination=data.route.destination.model_dump(),
                waypoints=[
                    w.model_dump()
                    for w in data.route.waypoints
                ]
            )

            route = self.route_repo.create_route(
                db,
                Route(
                    listing_id=listing.id,
                    origin_id=origin.id,
                    destination_id=destination.id,
                    distance_km=route_data["distanceKm"]
                )
            )

            for idx, wp in enumerate(data.route.waypoints):

                point = self.point_repo.create(
                    db,
                    Point(**wp.model_dump())
                )

                self.route_repo.create_waypoint(
                    db,
                    RouteWaypoint(
                        route_id=route.id,
                        point_id=point.id,
                        order_index=idx
                    )
                )

            # =========================
            # CARGO
            # =========================
            if data.cargo:

                volume = await self.cargo_client.calculate_volume(
                    data.cargo.length,
                    data.cargo.width,
                    data.cargo.height
                )

                self.cargo_repo.create(
                    db,
                    Cargo(
                        listing_id=listing.id,
                        cargo_type=data.cargo.cargoType,
                        weight=data.cargo.weight,
                        volume=volume,
                        length=data.cargo.length,
                        width=data.cargo.width,
                        height=data.cargo.height,
                        price=data.cargo.price
                    )
                )

            # =========================
            # TRANSPORT
            # =========================
            if data.transport:

                self.transport_repo.create(
                    db,
                    Transport(
                        listing_id=listing.id,
                        transport_type=data.transport.transportType,
                        max_weight=data.transport.maxWeight,
                        max_volume=data.transport.maxVolume
                    )
                )

            db.commit()
            db.refresh(listing)

            # =========================
            # EVENT
            # =========================
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

    async def delete_listing(
        self,
        db: Session,
        listing_id: str,
        user_id: str
    ):

        listing = self.listing_repo.get_by_id(
            db,
            listing_id
        )

        if not listing:
            raise HTTPException(404, "Listing not found")

        if str(listing.owner_id) != str(user_id):
            raise HTTPException(403, "Forbidden")

        try:

            await send_event(
                LISTING_DELETED_TOPIC,
                {
                    "listingId": str(listing.id)
                }
            )

            self.listing_repo.delete(
                db,
                listing
            )

            db.commit()

        except Exception:
            db.rollback()
            raise

        return {
            "status": "deleted",
            "id": listing_id
        }

    def get_listing(
        self,
        db: Session,
        listing_id: str,
        user_id: str | None = None
    ):

        listing = self.listing_repo.get_by_id(
            db,
            listing_id
        )

        if not listing:
            raise HTTPException(404, "Listing not found")

        # ACTIVE listings are public
        if listing.status == ListingStatus.ACTIVE:
            return listing

        # non-active доступны только владельцу
        if not user_id:
            raise HTTPException(403, "Forbidden")

        if str(listing.owner_id) != str(user_id):
            raise HTTPException(403, "Forbidden")

        return listing

    def get_my_listings(
        self,
        db: Session,
        user_id: str,
        status: str | None = None
    ):

        listings = self.listing_repo.get_by_owner(
            db,
            user_id
        )

        if status:

            return [
                listing
                for listing in listings
                if listing.status.value == status
            ]

        return listings

    async def update_listing(
        self,
        db: Session,
        listing_id: str,
        user_id: str,
        data: UpdateListingRequest
    ):

        listing = self.listing_repo.get_by_id(
            db,
            listing_id
        )

        if not listing:
            raise HTTPException(404, "Listing not found")

        if str(listing.owner_id) != str(user_id):
            raise HTTPException(403, "Forbidden")

        # =========================
        # BASIC FIELDS
        # =========================
        if data.title is not None:
            listing.title = data.title

        if data.description is not None:
            listing.description = data.description

        # =========================
        # CARGO
        # =========================
        if data.cargo:

            if listing.type != ListingType.CARGO:
                raise HTTPException(
                    400,
                    "Only cargo listings can contain cargo data"
                )

            if (
                data.cargo.price is not None
                and data.cargo.price < 0
            ):
                raise HTTPException(
                    400,
                    "Price must be >= 0"
                )

            if not listing.cargo:

                listing.cargo = Cargo(
                    listing_id=listing.id
                )

            cargo_data = data.cargo.model_dump(
                exclude_unset=True
            )

            for k, v in cargo_data.items():

                field_name = (
                    "cargo_type"
                    if k == "cargoType"
                    else k
                )

                setattr(
                    listing.cargo,
                    field_name,
                    v
                )

            # volume recalc
            if (
                listing.cargo.length is not None
                and listing.cargo.width is not None
                and listing.cargo.height is not None
            ):

                listing.cargo.volume = (
                    await self.cargo_client.calculate_volume(
                        listing.cargo.length,
                        listing.cargo.width,
                        listing.cargo.height
                    )
                )

        # =========================
        # TRANSPORT
        # =========================
        if data.transport:

            if not listing.transport:

                listing.transport = Transport(
                    listing_id=listing.id
                )

            transport_data = data.transport.model_dump(
                exclude_unset=True
            )

            for k, v in transport_data.items():

                field_name = (
                    "transport_type"
                    if k == "transportType"
                    else k
                )

                setattr(
                    listing.transport,
                    field_name,
                    v
                )

        # =========================
        # RE-MODERATION LOGIC
        # =========================
        should_resend_to_moderation = (
            listing.status == ListingStatus.MODERATION
            or listing.status == ListingStatus.ACTIVE
        )

        if should_resend_to_moderation:
            listing.status = ListingStatus.MODERATION

        db.commit()
        db.refresh(listing)

        # =========================
        # RE-SEND TO MODERATION
        # =========================
        if should_resend_to_moderation:

            event = {
                "listingId": str(listing.id),
                "ownerId": str(listing.owner_id),

                "title": listing.title,
                "description": listing.description,
                "type": listing.type.value,

                "cargo": None,
                "transport": None,
                "route": None
            }

            if listing.cargo:
                event["cargo"] = {
                    "cargoType": listing.cargo.cargo_type,
                    "weight": listing.cargo.weight,
                    "volume": listing.cargo.volume,
                    "length": listing.cargo.length,
                    "width": listing.cargo.width,
                    "height": listing.cargo.height,
                    "price": listing.cargo.price
                }

            if listing.transport:
                event["transport"] = {
                    "transportType": listing.transport.transport_type,
                    "maxWeight": listing.transport.max_weight,
                    "maxVolume": listing.transport.max_volume,
                }

            if listing.route:
                event["route"] = {
                    "origin": {
                        "city": listing.route.origin.city,
                        "country": listing.route.origin.country,
                        "latitude": listing.route.origin.latitude,
                        "longitude": listing.route.origin.longitude,
                    } if listing.route.origin else None,

                    "destination": {
                        "city": listing.route.destination.city,
                        "country": listing.route.destination.country,
                        "latitude": listing.route.destination.latitude,
                        "longitude": listing.route.destination.longitude,
                    } if listing.route.destination else None,

                    "waypoints": [
                        {
                            "city": w.point.city,
                            "country": w.point.country,
                            "latitude": w.point.latitude,
                            "longitude": w.point.longitude,
                        }
                        for w in listing.route.waypoints
                        if w.point
                    ],

                    "distanceKm": listing.route.distance_km
                }

            await send_event(
                LISTING_SENT_TO_MODERATION_TOPIC,
                event
            )

        return listing

    async def send_to_moderation(
        self,
        db: Session,
        listing_id: str,
        user_id: str
    ):

        listing = self.listing_repo.get_by_id(
            db,
            listing_id
        )

        if not listing:
            raise HTTPException(404, "Listing not found")

        if str(listing.owner_id) != str(user_id):
            raise HTTPException(403, "Forbidden")

        if listing.status not in [
            ListingStatus.DRAFT,
            ListingStatus.REJECTED
        ]:
            raise HTTPException(
                400,
                "Only draft listings can be sent to moderation"
            )

        listing.status = ListingStatus.MODERATION

        db.commit()

        listing = self.listing_repo.get_by_id(
            db,
            str(listing.id)
        )

        await send_event(
            LISTING_SENT_TO_MODERATION_TOPIC,
            {
                "listingId": str(listing.id),
                "ownerId": str(listing.owner_id),

                "title": listing.title,
                "description": listing.description,
                "type": listing.type.value,

                "cargo": {
                    "cargoType": listing.cargo.cargo_type,
                    "weight": listing.cargo.weight,
                    "volume": listing.cargo.volume,
                    "length": listing.cargo.length,
                    "width": listing.cargo.width,
                    "height": listing.cargo.height,
                    "price": listing.cargo.price,
                } if listing.cargo else None,

                "transport": {
                    "transportType": listing.transport.transport_type,
                    "maxWeight": listing.transport.max_weight,
                    "maxVolume": listing.transport.max_volume,
                } if listing.transport else None,

                "route": {
                    "origin": {
                        "city": listing.route.origin.city,
                        "country": listing.route.origin.country,
                        "latitude": listing.route.origin.latitude,
                        "longitude": listing.route.origin.longitude,
                    } if listing.route and listing.route.origin else None,

                    "destination": {
                        "city": listing.route.destination.city,
                        "country": listing.route.destination.country,
                        "latitude": listing.route.destination.latitude,
                        "longitude": listing.route.destination.longitude,
                    } if listing.route and listing.route.destination else None,

                    "waypoints": [
                        {
                            "city": waypoint.point.city,
                            "country": waypoint.point.country,
                            "latitude": waypoint.point.latitude,
                            "longitude": waypoint.point.longitude,
                        }
                        for waypoint in listing.route.waypoints
                    ] if listing.route and listing.route.waypoints else [],

                    "distanceKm": listing.route.distance_km
                    if listing.route else None,
                } if listing.route else None,
            }
        )

        return listing