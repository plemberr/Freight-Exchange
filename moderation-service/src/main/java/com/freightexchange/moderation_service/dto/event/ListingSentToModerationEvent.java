package com.freightexchange.moderation_service.dto.event;

import com.freightexchange.moderation_service.dto.listing.CargoDto;
import com.freightexchange.moderation_service.dto.listing.RouteDto;
import com.freightexchange.moderation_service.dto.listing.TransportDto;
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

    private UUID ownerId;

    private String title;

    private String description;

    private String type;

    private CargoDto cargo;

    private TransportDto transport;

    private RouteDto route;

}