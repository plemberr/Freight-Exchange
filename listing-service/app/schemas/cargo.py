from pydantic import BaseModel, ConfigDict, Field


class CargoRequest(BaseModel):
    # populate_by_name=True keeps incoming JSON with "cargoType" working,
    # while validation_alias lets the same model read the snake_case
    # cargo_type column off the ORM object when reused for the response.
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    cargoType: str | None = Field(default=None, validation_alias="cargo_type")
    weight: float | None = None
    volume: float | None = None

    length: float | None = None
    width: float | None = None
    height: float | None = None
    price: float | None = None