from pydantic import BaseModel, ConfigDict
from app.schemas.point import PointRequest
from pydantic import Field


class RouteRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    origin: PointRequest
    destination: PointRequest
    waypoints: list[PointRequest] = []

class RouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    origin: PointRequest
    destination: PointRequest
    waypoints: list[PointRequest] = []

    distanceKm: float | None = Field(
        default=None,
        alias="distance_km"
    )