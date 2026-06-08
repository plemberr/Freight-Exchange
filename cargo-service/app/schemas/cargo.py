from pydantic import BaseModel, Field
from typing import List


class VolumeCalculationRequest(BaseModel):
    length: float = Field(gt=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)


class VolumeCalculationResponse(BaseModel):
    volume: float


class DensityCalculationRequest(BaseModel):
    weight: float = Field(gt=0)
    volume: float = Field(gt=0)


class DensityCalculationResponse(BaseModel):
    density: float


class Cargo(BaseModel):
    weight: float
    volume: float
    length: float
    width: float
    height: float


class Transport(BaseModel):
    maxWeight: float
    maxVolume: float


class TransportValidationRequest(BaseModel):
    cargo: Cargo
    transport: Transport


class TransportValidationResponse(BaseModel):
    valid: bool
    errors: List[str]