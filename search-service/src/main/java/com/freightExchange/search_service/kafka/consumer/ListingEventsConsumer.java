package com.freightExchange.search_service.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freightExchange.search_service.dto.event.ListingDeletedEvent;
import com.freightExchange.search_service.dto.event.ListingPublishedEvent;
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
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = KafkaTopics.LISTING_PUBLISHED,
            groupId = "search-service-group"
    )
    public void consumePublished(String message) {

        try {
            ListingPublishedEvent event =
                    objectMapper.readValue(message, ListingPublishedEvent.class);

            log.info("Received listing.published: {}", event.getListingId());

            indexingService.handleListingPublished(event);

        } catch (Exception e) {
            log.error("Failed to parse listing.published event", e);
        }
    }

    @KafkaListener(
            topics = KafkaTopics.LISTING_DELETED,
            groupId = "search-service-group"
    )
    public void consumeDeleted(String message) {

        try {
            ListingDeletedEvent event =
                    objectMapper.readValue(message, ListingDeletedEvent.class);

            log.info("Received listing.deleted: {}", event.getListingId());

            indexingService.handleListingDeleted(event);

        } catch (Exception e) {
            log.error("Failed to parse listing.deleted event", e);
        }
    }
}