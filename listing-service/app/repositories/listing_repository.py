from sqlalchemy.orm import Session
from app.db.models.listing import Listing


class ListingRepository:

    def create(self, db: Session, listing: Listing) -> Listing:
        db.add(listing)
        db.flush()
        return listing

    def get_by_id(self, db: Session, listing_id: str) -> Listing | None:
        return (
            db.query(Listing)
            .filter(Listing.id == listing_id)
            .first()
        )

    def get_by_owner(self, db: Session, owner_id: str) -> list[Listing]:
        return (
            db.query(Listing)
            .filter(Listing.owner_id == owner_id)
            .all()
        )

    def delete(self, db: Session, listing: Listing) -> None:
        db.delete(listing)
        db.flush()