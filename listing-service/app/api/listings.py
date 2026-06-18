from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Literal

from app.api.deps import get_current_user, get_current_user_optional
from app.db.session import SessionLocal
from app.schemas.listing import (
    CreateListingRequest,
    ListingResponse,
    UpdateListingRequest
)
from app.services.listing_service import ListingService

router = APIRouter()
service = ListingService()


# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# CREATE LISTING
@router.post(
    "/",
    response_model=ListingResponse,
    status_code=201
)
async def create_listing(
    data: CreateListingRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await service.create_listing(
        db=db,
        user_id=current_user["sub"],
        data=data
    )


# GET MY LISTINGS
@router.get(
    "/",
    response_model=list[ListingResponse]
)
async def get_my_listings(
    status: Literal[
        "DRAFT",
        "MODERATION",
        "ACTIVE",
        "REJECTED",
        "ARCHIVED"
    ] | None = Query(default=None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return service.get_my_listings(
        db=db,
        user_id=current_user["sub"],
        status=status
    )

# GET LISTINGS BY USER ID
@router.get(
    "/user/{user_id}",
    response_model=list[ListingResponse]
)
async def get_user_listings(
    user_id: str,
    db: Session = Depends(get_db)
):
    return service.get_user_listings(
        db=db,
        user_id=user_id
    )

# GET BY ID (public according to OpenAPI)
@router.get(
    "/{listing_id}",
    response_model=ListingResponse
)
async def get_listing(
    listing_id: str,
    current_user=Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    return service.get_listing(
        db=db,
        listing_id=listing_id,
        user_id=current_user["sub"] if current_user else None
    )


# UPDATE LISTING
@router.put(
    "/{listing_id}",
    response_model=ListingResponse
)
async def update_listing(
    listing_id: str,
    data: UpdateListingRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await service.update_listing(
        db=db,
        listing_id=listing_id,
        user_id=current_user["sub"],
        data=data
    )


# DELETE LISTING
@router.delete(
    "/{listing_id}",
    status_code=204
)
async def delete_listing(
    listing_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    await service.delete_listing(
        db=db,
        listing_id=listing_id,
        user_id=current_user["sub"]
    )

    return Response(status_code=204)


# SEND TO MODERATION
@router.post(
    "/{listing_id}/send-to-moderation",
    response_model=ListingResponse
)
async def send_to_moderation(
    listing_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await service.send_to_moderation(
        db=db,
        listing_id=listing_id,
        user_id=current_user["sub"]
    )
