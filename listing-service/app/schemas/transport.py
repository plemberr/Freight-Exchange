from pydantic import BaseModel, ConfigDict, Field


class TransportRequest(BaseModel):
    # populate_by_name=True keeps incoming JSON with "transportType" etc.
    # working, while validation_alias lets the same model read the
    # snake_case columns (transport_type, max_weight, max_volume) off the
    # ORM object when this schema is reused for the response.
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    transportType: str | None = Field(default=None, validation_alias="transport_type")
    maxWeight: float | None = Field(default=None, validation_alias="max_weight")
    maxVolume: float | None = Field(default=None, validation_alias="max_volume")