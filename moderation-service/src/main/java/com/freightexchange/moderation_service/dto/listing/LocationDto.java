package com.freightexchange.moderation_service.dto.listing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationDto {

    private String city;

    private String country;

    private Double latitude;

    private Double longitude;
}