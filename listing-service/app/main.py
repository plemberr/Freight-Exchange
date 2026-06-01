from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from app.api.router import router
from app.kafka.kafka_producer import start_kafka_producer, stop_kafka_producer

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        logger.info("Starting Kafka producer...")
        await start_kafka_producer()
        logger.info("Kafka producer started")
    except Exception as e:
        logger.error(f"Kafka failed to start: {e}")
        logger.warning("Service will continue WITHOUT Kafka")

    yield

    logger.info("Stopping Kafka producer...")
    try:
        await stop_kafka_producer()
    except Exception as e:
        logger.error(f"Kafka stop error: {e}")

    logger.info("Kafka stopped")


app = FastAPI(
    title="Listing Service",
    lifespan=lifespan
)

app.include_router(router, prefix="/api/v1")