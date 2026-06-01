import uuid

from sqlalchemy import Integer, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RouteWaypoint(Base):
    __tablename__ = "route_waypoints"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    route_id: Mapped[str] = mapped_column(
        ForeignKey("routes.id", ondelete="CASCADE"),
        nullable=False
    )

    point_id: Mapped[str] = mapped_column(
        ForeignKey("points.id"),
        nullable=False
    )

    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    route = relationship("Route", back_populates="waypoints")
    point = relationship("Point", lazy="selectin")