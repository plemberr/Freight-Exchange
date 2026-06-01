from pydantic import BaseModel, ConfigDict
from app.schemas.point import PointRequest


class RouteRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    origin: PointRequest
    destination: PointRequest
    waypoints: list[PointRequest] = []