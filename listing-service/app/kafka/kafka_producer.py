import asyncio
import json
import logging
from aiokafka import AIOKafkaProducer

from app.core.config import settings

logger = logging.getLogger(__name__)


class KafkaProducer:
    def __init__(self):
        self._producer: AIOKafkaProducer | None = None

    async def start(self):
        retries = 5

        for attempt in range(retries):
            try:
                self._producer = AIOKafkaProducer(
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                )

                await self._producer.start()
                logger.info("Kafka producer started")
                return

            except Exception as e:
                logger.error(f"Kafka start failed ({attempt+1}/{retries}): {e}")
                await asyncio.sleep(5)

        raise RuntimeError("Kafka producer failed to start")

    async def stop(self):
        if self._producer:
            await self._producer.stop()
            logger.info("Kafka producer stopped")

    async def send(self, topic: str, payload: dict):
        if not self._producer:
            raise RuntimeError("Kafka producer not initialized")

        await self._producer.send_and_wait(
            topic,
            value=payload
        )


# ===== SINGLETON =====
kafka_producer = KafkaProducer()


# ===== COMPAT API (чтобы сервис НЕ ломался) =====
async def start_kafka_producer():
    await kafka_producer.start()


async def stop_kafka_producer():
    await kafka_producer.stop()


async def send_event(topic: str, payload: dict):
    await kafka_producer.send(topic, payload)