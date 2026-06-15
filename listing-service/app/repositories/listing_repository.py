from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from app.db.models.listing import Listing
from app.db.models.route import Route
from app.db.models.route_waypoint import RouteWaypoint


class ListingRepository:

    def create(self, db: Session, listing: Listing) -> Listing:
        db.add(listing)
        db.flush()
        return listing

    def get_by_id(
        self,
        db: Session,
        listing_id: str
    ) -> Listing | None:

        return (
            db.query(Listing)
            .options(
                selectinload(Listing.cargo),

                selectinload(Listing.transport),

                selectinload(Listing.route)
                .selectinload(Route.origin),

                selectinload(Listing.route)
                .selectinload(Route.destination),

                selectinload(Listing.route)
                .selectinload(Route.waypoints)
                .selectinload(RouteWaypoint.point),
            )
            .filter(Listing.id == listing_id)
            .first()
        )

    def get_by_owner(
        self,
        db: Session,
        owner_id: str
    ) -> list[Listing]:

        return (
            db.query(Listing)
            .filter(Listing.owner_id == owner_id)
            .all()
        )

    def delete(
        self,
        db: Session,
        listing: Listing
    ) -> None:

        db.delete(listing)
        db.flush()