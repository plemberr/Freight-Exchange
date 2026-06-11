package com.freightexchange.moderation_service.kafka.producer;

import com.freightexchange.moderation_service.dto.event.ListingApprovedEvent;
import com.freightexchange.moderation_service.dto.event.ListingRejectedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ModerationEventsProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendApprovedEvent(ListingApprovedEvent event) {

        kafkaTemplate.send(
                "listing.approved",
                event.getListingId().toString(),
                event
        );

        log.info(
                "Listing approved event sent: listingId={}",
                event.getListingId()
        );
    }

    public void sendRejectedEvent(ListingRejectedEvent event) {

        kafkaTemplate.send(
                "listing.rejected",
                event.getListingId().toString(),
                event
        );

        log.info(
                "Listing rejected event sent: listingId={}",
                event.getListingId()
        );
    }

}