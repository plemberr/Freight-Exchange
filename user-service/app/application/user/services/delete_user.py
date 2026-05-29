from app.infrastructure.db.models.user import User
from app.infrastructure.db.repositories.user_repository import UserRepository
from app.infrastructure.messaging.kafka_producer import UserEventProducer


class DeleteUserService:

    def __init__(
        self,
        repository: UserRepository,
    ):
        self.repository = repository
        self.producer = UserEventProducer()

    async def execute(
        self,
        user: User,
    ):
        user_id = user.id

        await self.repository.delete(user)

        await self.producer.publish_user_deleted(user_id)