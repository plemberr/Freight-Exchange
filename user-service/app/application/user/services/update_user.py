from app.infrastructure.db.models.user import User
from app.infrastructure.db.repositories.user_repository import UserRepository


class UpdateUserService:

    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def execute(
        self,
        user: User,
        name: str | None = None,
        phone: str | None = None,
    ):
        return await self.repository.update(
            user=user,
            name=name,
            phone=phone,
        )