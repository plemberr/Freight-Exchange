package com.freightexchange.moderation_service.service;

import com.freightexchange.moderation_service.domain.enums.ModerationStatus;
import com.freightexchange.moderation_service.dto.request.RejectRequest;
import com.freightexchange.moderation_service.dto.response.ModerationItem;

import java.util.List;
import java.util.UUID;

public interface ModerationService {

    List<ModerationItem> getQueue(ModerationStatus status);

    void approveListing(UUID listingId);

    void rejectListing(UUID listingId, RejectRequest request);

}