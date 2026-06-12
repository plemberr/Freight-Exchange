from fastapi import APIRouter

from app.api.cargo import router as cargo_router


api_router = APIRouter(prefix="/api/v1/cargo")

api_router.include_router(
    cargo_router,
    tags=["Cargo"]
)