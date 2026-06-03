package com.freightExchange.search_service.dto.response;

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
public class ListingSearchItem {

    private UUID id;

    private ListingType type;

    private String title;

    private String origin;

    private String destination;

    private BigDecimal weight;

    private BigDecimal volume;

    private String cargoType;

    private LocalDateTime createdAt;
}