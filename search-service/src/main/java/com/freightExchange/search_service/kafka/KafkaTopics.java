package com.freightExchange.search_service.kafka;

public final class KafkaTopics {

    private KafkaTopics() {
    }

    public static final String LISTING_CREATED = "listing.created";

    public static final String LISTING_UPDATED = "listing.updated";

    public static final String LISTING_DELETED = "listing.deleted";

    public static final String LISTING_PUBLISHED = "listing.published";
}