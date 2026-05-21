from app.infrastructure.db.models.user import User
from app.infrastructure.db.repositories.user_repository import UserRepository


class DeleteUserService:

    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def execute(
        self,
        user: User,
    ):
        await self.repository.delete(user)