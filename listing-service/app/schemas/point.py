from pydantic import BaseModel, ConfigDict


class PointRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    city: str
    country: str
    latitude: float
    longitude: float