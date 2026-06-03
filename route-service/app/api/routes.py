from fastapi import APIRouter

from app.clients.openrouteservice_client import OpenRouteServiceClient
from app.schemas.location import LocationResult
from app.schemas.route import (
    CalculatedRoute,
    RouteCalculationRequest
)
from app.services.route_service import RouteService

router = APIRouter()


@router.get("/health")
async def health():

    return {
        "status": "ok"
    }


@router.get(
    "/geocode",
    response_model=list[LocationResult]
)
async def geocode(
    query: str
):

    client = OpenRouteServiceClient()

    return await client.geocode(query)


@router.get(
    "/reverse-geocode",
    response_model=LocationResult
)
async def reverse_geocode(
    latitude: float,
    longitude: float
):

    client = OpenRouteServiceClient()

    return await client.reverse_geocode(
        latitude=latitude,
        longitude=longitude
    )


@router.post(
    "/calculate",
    response_model=CalculatedRoute
)
async def calculate(
    request: RouteCalculationRequest
):

    service = RouteService()

    return await service.calculate(
        origin=request.origin,
        destination=request.destination,
        waypoints=request.waypoints
    )