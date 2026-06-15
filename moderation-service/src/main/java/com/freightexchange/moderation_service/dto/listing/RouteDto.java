package com.freightexchange.moderation_service.dto.listing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteDto {

    private LocationDto origin;

    private LocationDto destination;

    private List<LocationDto> waypoints;

    private Double distanceKm;
}