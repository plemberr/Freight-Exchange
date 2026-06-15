from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI

from app.api.router import router

from app.kafka.kafka_producer import (
    start_kafka_producer,
    stop_kafka_producer
)

from app.kafka.kafka_consumer import ModerationConsumer

logger = logging.getLogger(__name__)

moderation_consumer = ModerationConsumer()


@asynccontextmanager
async def lifespan(app: FastAPI):

    try:
        logger.info("Starting Kafka producer...")
        await start_kafka_producer()

        logger.info("Starting Kafka consumer...")
        await moderation_consumer.start()

        asyncio.create_task(
            moderation_consumer.consume()
        )

        logger.info("Kafka started")

    except Exception as e:
        logger.error(f"Kafka startup failed: {e}")

    yield

    logger.info("Stopping Kafka...")

    try:
        await stop_kafka_producer()
        await moderation_consumer.stop()

    except Exception as e:
        logger.error(f"Kafka shutdown error: {e}")

    logger.info("Kafka stopped")


app = FastAPI(
    title="Listing Service",
    lifespan=lifespan
)

app.include_router(router, prefix="/api/v1")