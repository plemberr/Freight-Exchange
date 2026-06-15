package com.freightexchange.moderation_service.dto.listing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransportDto {

    private String transportType;

    private Double maxWeight;

    private Double maxVolume;
}