import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.db.models.user import User


class UserRepository:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        query = select(User).where(User.id == user_id)

        result = await self.session.execute(query)

        return result.scalar_one_or_none()

    async def update(
            self,
            user: User,
            name: str | None = None,
            phone: str | None = None,
    ) -> User:

        if name is not None:
            user.name = name

        if phone is not None:
            user.phone = phone

        await self.session.commit()

        await self.session.refresh(user)

        return user

    async def delete(
            self,
            user: User,
    ) -> None:

        await self.session.delete(user)

        await self.session.commit()

    async def block(
            self,
            user: User,
    ) -> User:

        user.is_blocked = True

        await self.session.commit()

        await self.session.refresh(user)

        return user