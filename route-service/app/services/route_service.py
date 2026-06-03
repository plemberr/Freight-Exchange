from app.clients.openrouteservice_client import OpenRouteServiceClient
from app.schemas.point import Point


class RouteService:

    def __init__(self):

        self.client = OpenRouteServiceClient()

    async def calculate(
        self,
        origin: Point,
        destination: Point,
        waypoints: list[Point]
    ):

        result = await self.client.calculate_route(
            origin=origin,
            destination=destination,
            waypoints=waypoints
        )

        return {
            "distanceKm": result["distance_km"],
            "estimatedDurationMinutes": int(result["duration_min"]),
            "polyline": result["polyline"],
            "points": [
                origin,
                *waypoints,
                destination
            ]
        }