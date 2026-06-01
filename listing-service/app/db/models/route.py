import uuid

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    listing_id: Mapped[str] = mapped_column(
        ForeignKey("listings.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    origin_id: Mapped[str] = mapped_column(
        ForeignKey("points.id"),
        nullable=False
    )

    destination_id: Mapped[str] = mapped_column(
        ForeignKey("points.id"),
        nullable=False
    )

    distance_km: Mapped[float | None] = mapped_column(Float)

    listing = relationship("Listing", back_populates="route")

    origin = relationship("Point", foreign_keys=[origin_id], lazy="selectin")
    destination = relationship("Point", foreign_keys=[destination_id], lazy="selectin")

    waypoints = relationship(
        "RouteWaypoint",
        back_populates="route",
        cascade="all, delete-orphan",
        lazy="selectin"
    )