package com.freightExchange.search_service.dto.request;

import com.freightExchange.search_service.domain.enums.ListingType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchRequest {

    private ListingType type;

    private String origin;

    private String destination;

    private String cargoType;

    private BigDecimal minWeight;

    private BigDecimal maxWeight;

    private BigDecimal minVolume;

    private BigDecimal maxVolume;

    @Builder.Default
    private Integer page = 0;

    @Builder.Default
    private Integer size = 20;

    private String sort;

    private String order;
}