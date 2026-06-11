package com.freightexchange.moderation_service.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ListingSentToModerationEvent {

    private UUID listingId;

    private String listingTitle;

    private UUID ownerId;

}