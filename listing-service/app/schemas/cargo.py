from pydantic import BaseModel, ConfigDict


class CargoRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cargoType: str | None = None
    weight: float | None = None
    volume: float | None = None

    length: float | None = None
    width: float | None = None
    height: float | None = None
    price: float | None = None