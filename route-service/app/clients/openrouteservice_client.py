import httpx

from app.core.config import settings
from app.schemas.location import LocationResult
from app.schemas.point import Point


class OpenRouteServiceClient:

    def __init__(self):

        self.base_url = settings.ORS_BASE_URL
        self.api_key = settings.ORS_API_KEY

    def _map_feature(self, feature: dict) -> LocationResult:

        props = feature.get("properties", {})
        coords = feature.get("geometry", {}).get("coordinates", [0, 0])

        return LocationResult(
            displayName=props.get("label"),
            city=props.get("locality"),
            country=props.get("country"),
            longitude=coords[0],
            latitude=coords[1]
        )

    async def geocode(
        self,
        query: str
    ) -> list[LocationResult]:

        url = f"{self.base_url}/geocode/search"

        params = {
            "api_key": self.api_key,
            "text": query
        }

        async with httpx.AsyncClient() as client:

            response = await client.get(
                url,
                params=params
            )

            response.raise_for_status()

            data = response.json()

            features = data.get("features", [])

            return [
                self._map_feature(feature)
                for feature in features
            ]

    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> LocationResult:

        url = f"{self.base_url}/geocode/reverse"

        params = {
            "api_key": self.api_key,
            "point.lat": latitude,
            "point.lon": longitude
        }

        async with httpx.AsyncClient() as client:

            response = await client.get(
                url,
                params=params
            )

            response.raise_for_status()

            data = response.json()

            features = data.get("features", [])

            if not features:

                return LocationResult(
                    displayName=None,
                    city=None,
                    country=None,
                    latitude=latitude,
                    longitude=longitude
                )

            return self._map_feature(features[0])

    async def calculate_route(
        self,
        origin: Point,
        destination: Point,
        waypoints: list[Point] | None = None
    ):

        url = f"{self.base_url}/v2/directions/driving-car"

        coordinates = [
            [origin.longitude, origin.latitude]
        ]

        if waypoints:

            coordinates.extend(
                [
                    [point.longitude, point.latitude]
                    for point in waypoints
                ]
            )

        coordinates.append(
            [destination.longitude, destination.latitude]
        )

        body = {
            "coordinates": coordinates
        }

        headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:

            response = await client.post(
                url,
                json=body,
                headers=headers
            )

            response.raise_for_status()

            data = response.json()

            route = data["routes"][0]

            summary = route["summary"]

            geometry = route["geometry"]

            return {
                "distance_km": summary["distance"] / 1000,
                "duration_min": summary["duration"] / 60,
                "polyline": geometry
            }