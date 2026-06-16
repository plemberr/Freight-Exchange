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

    // --- Фильтры, специфичные для груза (CARGO) ---
    private String cargoType;

    private BigDecimal minWeight;

    private BigDecimal maxWeight;

    private BigDecimal minVolume;

    private BigDecimal maxVolume;

    private BigDecimal minPrice;

    private BigDecimal maxPrice;

    private BigDecimal minLength;

    private BigDecimal maxLength;

    private BigDecimal minWidth;

    private BigDecimal maxWidth;

    private BigDecimal minHeight;

    private BigDecimal maxHeight;

    // --- Фильтры, специфичные для транспорта (TRANSPORT) ---
    private String transportType;

    // диапазон по максимальной грузоподъёмности транспорта (поле maxWeight у TRANSPORT)
    private BigDecimal minMaxWeight;

    private BigDecimal maxMaxWeight;

    // диапазон по максимальному объёму транспорта (поле maxVolume у TRANSPORT)
    private BigDecimal minMaxVolume;

    private BigDecimal maxMaxVolume;

    @Builder.Default
    private Integer page = 0;

    @Builder.Default
    private Integer size = 20;

    private String sort;

    private String order;
}