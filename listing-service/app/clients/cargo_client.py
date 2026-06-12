import httpx
from app.core.config import settings


class CargoClient:
    def __init__(self):
        self.base_url = settings.CARGO_SERVICE_URL

        self.client = httpx.AsyncClient(
            timeout=5.0
        )

    async def calculate_volume(self, length: float, width: float, height: float) -> float:
        response = await self.client.post(
            f"{self.base_url}/calculate-volume",
            json={
                "length": length,
                "width": width,
                "height": height
            }
        )

        response.raise_for_status()
        return response.json()["volume"]

    async def calculate_density(self, weight: float, volume: float) -> float:
        response = await self.client.post(
            f"{self.base_url}/calculate-density",
            json={
                "weight": weight,
                "volume": volume
            }
        )

        response.raise_for_status()
        return response.json()["density"]

    async def validate_transport(self, cargo: dict, transport: dict) -> dict:
        response = await self.client.post(
            f"{self.base_url}/validate-transport",
            json={
                "cargo": cargo,
                "transport": transport
            }
        )

        response.raise_for_status()
        return response.json()

    async def close(self):
        await self.client.aclose()