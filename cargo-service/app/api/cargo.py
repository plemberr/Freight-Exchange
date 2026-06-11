from fastapi import APIRouter

from app.schemas.cargo import (
    VolumeCalculationRequest,
    VolumeCalculationResponse,
    DensityCalculationRequest,
    DensityCalculationResponse,
    TransportValidationRequest,
    TransportValidationResponse
)

from app.services.cargo_service import CargoService


router = APIRouter()

service = CargoService()


@router.post(
    "/calculate-volume",
    response_model=VolumeCalculationResponse
)
def calculate_volume(
    request: VolumeCalculationRequest
):

    volume = service.calculate_volume(
        request.length,
        request.width,
        request.height
    )

    return VolumeCalculationResponse(
        volume=volume
    )

@router.post(
    "/calculate-density",
    response_model=DensityCalculationResponse
)
def calculate_density(
    request: DensityCalculationRequest
):

    density = service.calculate_density(
        request.weight,
        request.volume
    )

    return DensityCalculationResponse(
        density=density
    )

@router.post(
    "/validate-transport",
    response_model=TransportValidationResponse
)
def validate_transport(request: TransportValidationRequest):

    valid, errors = service.validate_transport(
        request.cargo,
        request.transport
    )

    return TransportValidationResponse(
        valid=valid,
        errors=errors
    )