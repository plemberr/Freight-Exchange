from fastapi import APIRouter
from app.api.listings import router as listings_router

router = APIRouter()

router.include_router(
    listings_router,
    prefix="/listings",
    tags=["Listings"]
)