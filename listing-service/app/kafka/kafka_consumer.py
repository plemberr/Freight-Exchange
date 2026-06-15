import json
import logging

from aiokafka import AIOKafkaConsumer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.db.enums.listing import ListingStatus
from app.db.models.listing import Listing

logger = logging.getLogger(__name__)


class ModerationConsumer:

    def __init__(self):
        self.consumer = None

    async def start(self):

        self.consumer = AIOKafkaConsumer(
            "listing.approved",
            "listing.rejected",
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id="listing-service",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        )

        await self.consumer.start()

        logger.info("Moderation consumer started")

    async def stop(self):

        if self.consumer:
            await self.consumer.stop()
            logger.info("Moderation consumer stopped")

    async def consume(self):

        async for msg in self.consumer:

            try:
                payload = msg.value
                topic = msg.topic

                listing_id = payload["listingId"]

                db: Session = SessionLocal()

                try:
                    listing = db.query(Listing).filter(
                        Listing.id == listing_id
                    ).first()

                    if not listing:
                        logger.warning(
                            f"Listing not found: {listing_id}"
                        )
                        continue

                    if topic == "listing.approved":

                        listing.status = ListingStatus.ACTIVE

                        # очищаем комментарий модерации
                        listing.moderation_comment = None

                        logger.info(
                            f"Listing approved: {listing_id}"
                        )

                    elif topic == "listing.rejected":

                        listing.status = ListingStatus.REJECTED

                        # сохраняем reason
                        listing.moderation_comment = payload.get("reason")

                        logger.info(
                            f"Listing rejected: {listing_id}"
                        )

                    db.commit()

                finally:
                    db.close()

            except Exception as e:
                logger.error(f"Kafka consume error: {e}")