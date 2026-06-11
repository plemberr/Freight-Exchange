package com.freightexchange.moderation_service.mapper;

import com.freightexchange.moderation_service.domain.entity.ModerationQueueItem;
import com.freightexchange.moderation_service.dto.response.ModerationItem;
import org.springframework.stereotype.Component;

@Component
public class ModerationMapper {

    public ModerationItem toDto(ModerationQueueItem item) {

        return ModerationItem.builder()
                .listingId(item.getListingId())
                .listingTitle(item.getListingTitle())
                .ownerId(item.getOwnerId())
                .status(item.getStatus())
                .rejectionReason(item.getRejectionReason())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}