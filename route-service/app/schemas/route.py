from pydantic import BaseModel
from pydantic import Field

from app.schemas.point import Point


class RouteCalculationRequest(BaseModel):

    origin: Point

    destination: Point

    waypoints: list[Point] = Field(default_factory=list)


class CalculatedRoute(BaseModel):

    distanceKm: float

    estimatedDurationMinutes: int

    polyline: str

    points: list[Point]