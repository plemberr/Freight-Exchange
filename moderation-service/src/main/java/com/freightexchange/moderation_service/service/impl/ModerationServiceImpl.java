package com.freightexchange.moderation_service.service.impl;

import com.freightexchange.moderation_service.domain.entity.ModerationQueueItem;
import com.freightexchange.moderation_service.domain.enums.ModerationStatus;
import com.freightexchange.moderation_service.domain.repository.ModerationQueueRepository;
import com.freightexchange.moderation_service.dto.event.ListingApprovedEvent;
import com.freightexchange.moderation_service.dto.event.ListingRejectedEvent;
import com.freightexchange.moderation_service.dto.request.RejectRequest;
import com.freightexchange.moderation_service.dto.response.ModerationItem;
import com.freightexchange.moderation_service.exception.ModerationException;
import com.freightexchange.moderation_service.kafka.producer.ModerationEventsProducer;
import com.freightexchange.moderation_service.mapper.ModerationMapper;
import com.freightexchange.moderation_service.service.ModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ModerationServiceImpl implements ModerationService {

    private final ModerationQueueRepository moderationQueueRepository;
    private final ModerationEventsProducer moderationEventsProducer;
    private final ModerationMapper moderationMapper;

    @Override
    public List<ModerationItem> getQueue(ModerationStatus status) {

        List<ModerationQueueItem> items =
                (status != null)
                        ? moderationQueueRepository.findAllByStatus(status)
                        : moderationQueueRepository.findAll();

        return items.stream()
                .map(moderationMapper::toDto)
                .toList();
    }

    @Override
    public void approveListing(UUID listingId) {
        ModerationQueueItem item = moderationQueueRepository
                .findByListingId(listingId)
                .orElseThrow(() -> new ModerationException(
                        "Listing not found in moderation queue"
                ));

        ListingApprovedEvent event = ListingApprovedEvent.builder()
                .listingId(item.getListingId())
                .build();

        moderationEventsProducer.sendApprovedEvent(event);

        moderationQueueRepository.delete(item);
    }

    @Override
    public void rejectListing(UUID listingId, RejectRequest request) {
    
        ModerationQueueItem item = moderationQueueRepository
                .findByListingId(listingId)
                .orElseThrow(() -> new ModerationException(
                        "Listing not found in moderation queue"
                ));
    
        ListingRejectedEvent event = ListingRejectedEvent.builder()
                .listingId(item.getListingId())
                .reason(request.getReason())
                .build();
    
        moderationEventsProducer.sendRejectedEvent(event);
    
        moderationQueueRepository.delete(item);
    }

}