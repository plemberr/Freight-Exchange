import json
import uuid

from aiokafka import AIOKafkaProducer

from app.core.config import settings
from app.infrastructure.messaging.topics import USER_DELETED_TOPIC


class UserEventProducer:

    def __init__(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers
        )

    async def publish_user_deleted(
        self,
        user_id: uuid.UUID,
    ):
        await self.producer.start()

        try:
            payload = {
                "userId": str(user_id)
            }

            print(f"Sending delete event: {payload}")

            await self.producer.send_and_wait(
                USER_DELETED_TOPIC,
                json.dumps(payload).encode(),
            )

        finally:
            await self.producer.stop()