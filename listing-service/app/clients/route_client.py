import httpx
from app.core.config import settings


class RouteClient:
    def __init__(self):
        self.base_url = settings.ROUTE_SERVICE_URL

    async def calculate_route(self, origin, destination, waypoints=None):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/calculate",
                json={
                    "origin": origin,
                    "destination": destination,
                    "waypoints": waypoints or []
                }
            )
            response.raise_for_status()
            return response.json()

    async def geocode(self, query: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/geocode",
                params={"query": query}
            )
            response.raise_for_status()
            return response.json()