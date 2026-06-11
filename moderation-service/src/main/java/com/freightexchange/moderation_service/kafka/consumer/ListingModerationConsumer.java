package com.freightexchange.moderation_service.kafka.consumer;

import com.freightexchange.moderation_service.domain.entity.ModerationQueueItem;
import com.freightexchange.moderation_service.domain.enums.ModerationStatus;
import com.freightexchange.moderation_service.domain.repository.ModerationQueueRepository;
import com.freightexchange.moderation_service.dto.event.ListingSentToModerationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ListingModerationConsumer {

    private final ModerationQueueRepository moderationQueueRepository;

    @KafkaListener(
            topics = "listing.sent_to_moderation",
            groupId = "moderation-group",
            containerFactory = "listingSentToModerationKafkaListenerFactory"
    )
    public void consume(ListingSentToModerationEvent event) {

        log.info(
                "Received listing for moderation: listingId={}",
                event.getListingId()
        );

        boolean alreadyExists = moderationQueueRepository
                .findByListingId(event.getListingId())
                .isPresent();

        if (alreadyExists) {

            log.warn(
                    "Listing already exists in moderation queue: listingId={}",
                    event.getListingId()
            );

            return;
        }

        ModerationQueueItem item = ModerationQueueItem.builder()
                .listingId(event.getListingId())
                .listingTitle(event.getListingTitle())
                .ownerId(event.getOwnerId())
                .status(ModerationStatus.PENDING)
                .build();

        moderationQueueRepository.save(item);

        log.info(
                "Listing added to moderation queue: listingId={}",
                event.getListingId()
        );
    }

}