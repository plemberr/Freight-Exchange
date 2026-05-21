import asyncio
import json
import uuid

from aiokafka import AIOKafkaConsumer

from app.core.config import settings
from app.infrastructure.db.models.user import User
from app.infrastructure.db.session import AsyncSessionLocal
from app.infrastructure.messaging.topics import USER_REGISTERED_TOPIC


async def consume_user_registered():
    # Ожидание запуска Kafka после старта контейнеров
    await asyncio.sleep(10)

    while True:
        try:
            consumer = AIOKafkaConsumer(
                USER_REGISTERED_TOPIC,
                bootstrap_servers=settings.kafka_bootstrap_servers,
                group_id="user-service-group",
                auto_offset_reset="earliest",
            )

            print("Starting Kafka consumer...")
            await consumer.start()
            print("Kafka consumer started successfully")

            try:
                async for message in consumer:
                    data = json.loads(message.value.decode())
                    print("Kafka event received:", data)

                    async with AsyncSessionLocal() as db:
                        existing_user = await db.get(
                            User,
                            uuid.UUID(data["userId"])
                        )
                        if existing_user:
                            continue

                        user = User(
                            id=uuid.UUID(data["userId"]),
                            email=data["email"],
                            role=data.get("role", "USER"),
                            is_blocked=False,
                        )
                        db.add(user)
                        await db.commit()
                        print(f"User {user.email} saved")
            finally:
                await consumer.stop()

        except Exception as e:
            print(f"Kafka consumer error: {e}")
            print("Retrying in 5 seconds...")
            await asyncio.sleep(5)
