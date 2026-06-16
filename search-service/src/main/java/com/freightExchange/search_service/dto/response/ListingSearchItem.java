package com.freightExchange.search_service.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.freightExchange.search_service.domain.enums.ListingType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ListingSearchItem {

    private UUID id;

    private ListingType type;

    private String title;

    private String origin;

    private String destination;

    // --- Поля, специфичные для груза (CARGO) ---
    private String cargoType;

    private BigDecimal weight;

    private BigDecimal volume;

    private BigDecimal length;

    private BigDecimal width;

    private BigDecimal height;

    private BigDecimal price;

    // --- Поля, специфичные для транспорта (TRANSPORT) ---
    private String transportType;

    private BigDecimal maxVolume;

    private BigDecimal maxWeight;

    private LocalDateTime createdAt;
}