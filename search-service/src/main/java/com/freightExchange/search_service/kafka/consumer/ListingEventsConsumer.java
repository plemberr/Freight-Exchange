package com.freightExchange.search_service.kafka.consumer;

import com.freightExchange.search_service.dto.event.ListingCreatedEvent;
import com.freightExchange.search_service.dto.event.ListingDeletedEvent;
import com.freightExchange.search_service.dto.event.ListingPublishedEvent;
import com.freightExchange.search_service.dto.event.ListingUpdatedEvent;
import com.freightExchange.search_service.kafka.KafkaTopics;
import com.freightExchange.search_service.service.IndexingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ListingEventsConsumer {

    private final IndexingService indexingService;

    @KafkaListener(
            topics = KafkaTopics.LISTING_CREATED,
            groupId = "search-service-group"
    )
    public void consumeCreated(
            ListingCreatedEvent event
    ) {

        log.info(
                "Received listing.created event: {}",
                event.getId()
        );

        indexingService.handleListingCreated(event);
    }

    @KafkaListener(
            topics = KafkaTopics.LISTING_UPDATED,
            groupId = "search-service-group"
    )
    public void consumeUpdated(
            ListingUpdatedEvent event
    ) {

        log.info(
                "Received listing.updated event: {}",
                event.getId()
        );

        indexingService.handleListingUpdated(event);
    }

    @KafkaListener(
            topics = KafkaTopics.LISTING_DELETED,
            groupId = "search-service-group"
    )
    public void consumeDeleted(
            ListingDeletedEvent event
    ) {

        log.info(
                "Received listing.deleted event: {}",
                event.getId()
        );

        indexingService.handleListingDeleted(event);
    }

    @KafkaListener(
            topics = KafkaTopics.LISTING_PUBLISHED,
            groupId = "search-service-group"
    )
    public void consumePublished(
            ListingPublishedEvent event
    ) {

        log.info(
                "Received listing.published event: {}",
                event.getId()
        );

        indexingService.handleListingPublished(event);
    }
}