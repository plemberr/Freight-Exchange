package com.freightexchange.moderation_service.domain.repository;

import com.freightexchange.moderation_service.domain.entity.ModerationQueueItem;
import com.freightexchange.moderation_service.domain.enums.ModerationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ModerationQueueRepository
        extends JpaRepository<ModerationQueueItem, Long> {

    List<ModerationQueueItem> findAllByStatus(ModerationStatus status);

    Optional<ModerationQueueItem> findByListingId(UUID listingId);

}