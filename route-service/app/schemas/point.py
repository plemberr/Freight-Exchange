from pydantic import BaseModel


class Point(BaseModel):

    latitude: float
    longitude: float

    city: str | None = None
    country: str | None = None