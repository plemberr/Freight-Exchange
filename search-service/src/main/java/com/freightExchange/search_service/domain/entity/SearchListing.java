package com.freightExchange.search_service.domain.entity;

import com.freightExchange.search_service.domain.enums.ListingStatus;
import com.freightExchange.search_service.domain.enums.ListingType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "search_listings",
        indexes = {
                @Index(name = "idx_search_listing_type", columnList = "type"),
                @Index(name = "idx_search_listing_origin", columnList = "origin"),
                @Index(name = "idx_search_listing_destination", columnList = "destination"),
                @Index(name = "idx_search_listing_cargo_type", columnList = "cargo_type"),
                @Index(name = "idx_search_listing_status", columnList = "status"),
                @Index(name = "idx_search_listing_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchListing {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ListingType type;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 255)
    private String origin;

    @Column(nullable = false, length = 255)
    private String destination;

    @Column(name = "cargo_type", length = 100)
    private String cargoType;

    @Column(precision = 12, scale = 2)
    private BigDecimal weight;

    @Column(precision = 12, scale = 2)
    private BigDecimal volume;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ListingStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}