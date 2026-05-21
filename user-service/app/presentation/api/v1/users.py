import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.user.services.get_user import GetUserService
from app.application.user.services.update_user import UpdateUserService
from app.application.user.services.delete_user import DeleteUserService
from app.application.user.services.block_user import BlockUserService

from app.core.auth import get_current_user, require_role
from app.core.dependencies import get_db

from app.infrastructure.db.models.user import User
from app.infrastructure.db.repositories.user_repository import UserRepository

from app.presentation.api.schemas.user import (
    UserResponse,
    UpdateUserRequest,
)


router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    repository = UserRepository(db)

    service = GetUserService(repository)

    user = await service.execute(user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
)
async def update_me(
    data: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repository = UserRepository(db)

    service = UpdateUserService(repository)

    updated_user = await service.execute(
        user=current_user,
        name=data.name,
        phone=data.phone,
    )

    return updated_user


@router.delete(
    "/me",
    status_code=204,
)
async def delete_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repository = UserRepository(db)

    service = DeleteUserService(repository)

    await service.execute(current_user)


@router.post(
    "/admin/{user_id}/block",
    response_model=UserResponse,
)
async def admin_block_user(
    user_id: uuid.UUID,
    admin_user: User = Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    repository = UserRepository(db)

    user = await repository.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    service = BlockUserService(repository)

    blocked_user = await service.execute(user)

    return blocked_user