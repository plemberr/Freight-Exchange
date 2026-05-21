import uuid

from app.infrastructure.db.repositories.user_repository import UserRepository


class GetUserService:

    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def execute(self, user_id: uuid.UUID):
        return await self.repository.get_by_id(user_id)