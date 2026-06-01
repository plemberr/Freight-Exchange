from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.enums.listing import ListingStatus
from app.db.models.listing import Listing
from app.db.models.cargo import Cargo
from app.db.models.transport import Transport
from app.db.models.point import Point
from app.db.models.route import Route
from app.db.models.route_waypoint import RouteWaypoint

from app.repositories.listing_repository import ListingRepository
from app.repositories.cargo_repository import CargoRepository
from app.repositories.transport_repository import TransportRepository
from app.repositories.point_repository import PointRepository
from app.repositories.route_repository import RouteRepository

from app.schemas.listing import CreateListingRequest, UpdateListingRequest

from app.kafka.kafka_producer import send_event
from app.kafka.topics import LISTING_CREATED_TOPIC


class ListingService:

    def __init__(self):
        self.listing_repo = ListingRepository()
        self.cargo_repo = CargoRepository()
        self.transport_repo = TransportRepository()
        self.point_repo = PointRepository()
        self.route_repo = RouteRepository()

    async def create_listing(self, db: Session, user_id: str, data: CreateListingRequest):

        try:
            listing = Listing(
                owner_id=user_id,
                type=data.type,
                title=data.title,
                description=data.description,
                status=ListingStatus.DRAFT
            )

            self.listing_repo.create(db, listing)

            origin = self.point_repo.create(db, Point(**data.route.origin.model_dump()))
            destination = self.point_repo.create(db, Point(**data.route.destination.model_dump()))

            route = self.route_repo.create_route(
                db,
                Route(
                    listing_id=listing.id,
                    origin_id=origin.id,
                    destination_id=destination.id
                )
            )

            for idx, wp in enumerate(data.route.waypoints):
                point = self.point_repo.create(db, Point(**wp.model_dump()))

                self.route_repo.create_waypoint(
                    db,
                    RouteWaypoint(
                        route_id=route.id,
                        point_id=point.id,
                        order_index=idx
                    )
                )

            if data.cargo:
                self.cargo_repo.create(
                    db,
                    Cargo(
                        listing_id=listing.id,
                        cargo_type=data.cargo.cargoType,
                        weight=data.cargo.weight,
                        volume=data.cargo.volume,
                        length=data.cargo.length,
                        width=data.cargo.width,
                        height=data.cargo.height
                    )
                )

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

            await kafka_producer.send(
                LISTING_CREATED_TOPIC,
                {
                    "listingId": listing.id,
                    "ownerId": listing.owner_id,
                    "type": listing.type.value,
                    "status": listing.status.value
                }
            )

            return listing

        except Exception:
            db.rollback()
            raise

    def get_listing(self, db: Session, listing_id: str):

        listing = self.listing_repo.get_by_id(db, listing_id)

        if not listing:
            raise HTTPException(404, "Listing not found")

        return listing

    def get_my_listings(self, db: Session, user_id: str, status: str | None = None):

        listings = self.listing_repo.get_by_owner(db, user_id)

        if status:
            return [l for l in listings if l.status.value == status]

        return listings

    async def update_listing(self, db: Session, listing_id: str, user_id: str, data: UpdateListingRequest):

        listing = self.listing_repo.get_by_id(db, listing_id)

        if not listing:
            raise HTTPException(404, "Listing not found")

        if listing.owner_id != user_id:
            raise HTTPException(403, "Forbidden")

        if data.title:
            listing.title = data.title

        if data.description:
            listing.description = data.description

        if data.cargo:
            if not listing.cargo:
                listing.cargo = Cargo(listing_id=listing.id)

            for k, v in data.cargo.model_dump().items():
                setattr(listing.cargo, k if k != "cargoType" else "cargo_type", v)

        if data.transport:
            if not listing.transport:
                listing.transport = Transport(listing_id=listing.id)

            for k, v in data.transport.model_dump().items():
                setattr(listing.transport, k if k != "transportType" else "transport_type", v)

        db.commit()
        db.refresh(listing)

        return listing

    async def send_to_moderation(self, db: Session, listing_id: str, user_id: str):

        listing = self.listing_repo.get_by_id(db, listing_id)

        if not listing:
            raise HTTPException(404, "Listing not found")

        if listing.owner_id != user_id:
            raise HTTPException(403, "Forbidden")

        if listing.status != ListingStatus.DRAFT:
            raise HTTPException(400, "Only draft listings can be sent to moderation")

        listing.status = ListingStatus.MODERATION

        db.commit()
        db.refresh(listing)

        return listing