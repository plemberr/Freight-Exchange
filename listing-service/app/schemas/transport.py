from pydantic import BaseModel, ConfigDict


class TransportRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transportType: str | None = None
    maxWeight: float | None = None
    maxVolume: float | None = None