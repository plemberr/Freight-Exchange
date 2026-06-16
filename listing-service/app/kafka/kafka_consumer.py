import json
import logging

from aiokafka import AIOKafkaConsumer
from sqlalchemy.orm import Session

from app.core.config import settings

from app.db.session import SessionLocal

from app.db.models.listing import Listing

from app.db.enums.listing import ListingStatus

from app.kafka.kafka_producer import send_event

from app.kafka.topics import (
    LISTING_PUBLISHED_TOPIC,
)

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

            value_deserializer=lambda m: json.loads(
                m.decode("utf-8")
            ),
        )

        await self.consumer.start()

        logger.info(
            "Moderation consumer started"
        )

    async def stop(self):

        if self.consumer:

            await self.consumer.stop()

            logger.info(
                "Moderation consumer stopped"
            )

    async def consume(self):

        async for msg in self.consumer:

            db: Session = SessionLocal()

            try:

                payload = msg.value
                topic = msg.topic

                logger.info(
                    f"Received kafka event: "
                    f"topic={topic}, payload={payload}"
                )

                listing_id = payload["listingId"]

                listing = (
                    db.query(Listing)
                    .filter(Listing.id == listing_id)
                    .first()
                )

                if not listing:

                    logger.warning(
                        f"Listing not found: {listing_id}"
                    )

                    continue

                # =====================================
                # APPROVED
                # =====================================
                if topic == "listing.approved":

                    listing.status = ListingStatus.ACTIVE

                    # очищаем комментарий модерации
                    listing.moderation_comment = None

                    db.commit()
                    db.refresh(listing)

                    logger.info(
                        f"Listing approved: {listing_id}"
                    )

                    # ==============================
                    # SEND PUBLISHED EVENT
                    # ==============================
                    event = {
                        "listingId": str(listing.id),
                        "ownerId": str(listing.owner_id),

                        "title": listing.title,
                        "description": listing.description,

                        "type": listing.type.value,
                        "status": listing.status.value,

                        "cargo": None,
                        "transport": None,
                        "route": None,
                    }

                    # ==============================
                    # CARGO
                    # ==============================
                    if listing.cargo:

                        event["cargo"] = {
                            "cargoType": listing.cargo.cargo_type,
                            "weight": listing.cargo.weight,
                            "volume": listing.cargo.volume,
                            "length": listing.cargo.length,
                            "width": listing.cargo.width,
                            "height": listing.cargo.height,
                            "price": listing.cargo.price,
                        }

                    # ==============================
                    # TRANSPORT
                    # ==============================
                    if listing.transport:

                        event["transport"] = {
                            "transportType":
                                listing.transport.transport_type,

                            "maxWeight":
                                listing.transport.max_weight,

                            "maxVolume":
                                listing.transport.max_volume,
                        }

                    # ==============================
                    # ROUTE
                    # ==============================
                    if listing.route:

                        event["route"] = {

                            "origin": {
                                "city":
                                    listing.route.origin.city,

                                "country":
                                    listing.route.origin.country,

                                "latitude":
                                    listing.route.origin.latitude,

                                "longitude":
                                    listing.route.origin.longitude,

                            } if listing.route.origin else None,

                            "destination": {
                                "city":
                                    listing.route.destination.city,

                                "country":
                                    listing.route.destination.country,

                                "latitude":
                                    listing.route.destination.latitude,

                                "longitude":
                                    listing.route.destination.longitude,

                            } if listing.route.destination else None,

                            "waypoints": [
                                {
                                    "city": waypoint.point.city,
                                    "country": waypoint.point.country,
                                    "latitude":
                                        waypoint.point.latitude,
                                    "longitude":
                                        waypoint.point.longitude,
                                }

                                for waypoint
                                in listing.route.waypoints

                                if waypoint.point
                            ],

                            "distanceKm":
                                listing.route.distance_km
                        }

                    await send_event(
                        LISTING_PUBLISHED_TOPIC,
                        event
                    )

                    logger.info(
                        f"Listing published event sent: "
                        f"{listing_id}"
                    )

                # =====================================
                # REJECTED
                # =====================================
                elif topic == "listing.rejected":

                    listing.status = ListingStatus.REJECTED

                    listing.moderation_comment = (
                        payload.get("reason")
                    )

                    db.commit()
                    db.refresh(listing)

                    logger.info(
                        f"Listing rejected: {listing_id}"
                    )

            except Exception as e:

                db.rollback()

                logger.error(
                    f"Kafka consume error: {e}",
                    exc_info=True
                )

            finally:

                db.close()