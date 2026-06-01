import uuid

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums.listing import ListingType, ListingStatus


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    owner_id: Mapped[str] = mapped_column(
        String,
        index=True,
        nullable=False
    )

    type: Mapped[ListingType] = mapped_column(
        Enum(ListingType),
        nullable=False
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    status: Mapped[ListingStatus] = mapped_column(
        Enum(ListingStatus),
        default=ListingStatus.DRAFT,
        nullable=False,
        index=True
    )

    moderation_comment: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    cargo = relationship(
        "Cargo",
        back_populates="listing",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    transport = relationship(
        "Transport",
        back_populates="listing",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    route = relationship(
        "Route",
        back_populates="listing",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin"
    )