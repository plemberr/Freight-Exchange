from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

from app.db.enums.listing import ListingType, ListingStatus
from app.schemas.cargo import CargoRequest
from app.schemas.transport import TransportRequest
from app.schemas.route import (
    RouteRequest,
    RouteResponse
)


class CreateListingRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: ListingType
    title: str
    description: str | None = None

    cargo: CargoRequest | None = None
    transport: TransportRequest | None = None

    route: RouteRequest


class UpdateListingRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str | None = None
    description: str | None = None

    cargo: CargoRequest | None = None
    transport: TransportRequest | None = None


class ListingResponse(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    id: str

    ownerId: str = Field(alias="owner_id")

    type: ListingType
    title: str
    description: str | None = None

    status: ListingStatus

    cargo: CargoRequest | None = None
    transport: TransportRequest | None = None
    route: RouteResponse | None = None

    moderationComment: str | None = Field(
        default=None,
        alias="moderation_comment"
    )

    createdAt: datetime = Field(alias="created_at")