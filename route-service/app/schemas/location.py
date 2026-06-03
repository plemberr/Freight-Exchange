from pydantic import BaseModel


class LocationResult(BaseModel):

    displayName: str | None = None

    city: str | None = None
    country: str | None = None

    latitude: float
    longitude: float