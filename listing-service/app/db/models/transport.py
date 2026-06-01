import uuid

from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Transport(Base):
    __tablename__ = "transport"

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

    transport_type: Mapped[str | None] = mapped_column(String(255))

    max_weight: Mapped[float | None] = mapped_column(Float)
    max_volume: Mapped[float | None] = mapped_column(Float)

    listing = relationship("Listing", back_populates="transport")