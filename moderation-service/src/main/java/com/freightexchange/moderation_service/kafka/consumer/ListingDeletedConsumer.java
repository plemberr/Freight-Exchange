package com.freightexchange.moderation_service.kafka.consumer;

import com.freightexchange.moderation_service.domain.repository.ModerationQueueRepository;
import com.freightexchange.moderation_service.dto.event.ListingDeletedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ListingDeletedConsumer {

    private final ModerationQueueRepository moderationQueueRepository;

    @KafkaListener(
            topics = "listing.deleted",
            groupId = "moderation-group",
            containerFactory = "listingDeletedKafkaListenerFactory"
    )
    public void consume(ListingDeletedEvent event) {

        try {

            moderationQueueRepository
                    .findByListingId(event.getListingId())
                    .ifPresent(moderationQueueRepository::delete);

            log.info(
                    "Listing removed from moderation queue: {}",
                    event.getListingId()
            );

        } catch (Exception e) {

            log.error(
                    "Failed to process delete event: {}",
                    e.getMessage(),
                    e
            );
        }
    }
}