package com.freightexchange.moderation_service.dto.response;

import com.freightexchange.moderation_service.domain.enums.ModerationStatus;
import com.freightexchange.moderation_service.dto.listing.CargoDto;
import com.freightexchange.moderation_service.dto.listing.RouteDto;
import com.freightexchange.moderation_service.dto.listing.TransportDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerationItem {

    private UUID listingId;

    private String listingTitle;

    private UUID ownerId;

    private ModerationStatus status;

    private String rejectionReason;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private String description;

    private String type;

    private CargoDto cargo;

    private TransportDto transport;

    private RouteDto route;
}