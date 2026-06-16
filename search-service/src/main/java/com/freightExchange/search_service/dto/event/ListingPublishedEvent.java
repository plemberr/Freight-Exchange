package com.freightExchange.search_service.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingPublishedEvent {

    private UUID listingId;
    private UUID ownerId;

    private String title;

    private String type;
    private String status;

    private Cargo cargo;
    private Transport transport;
    private Route route;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Cargo {
        private String cargoType;
        private BigDecimal weight;
        private BigDecimal volume;
        private BigDecimal length;
        private BigDecimal width;
        private BigDecimal height;
        private BigDecimal price;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Transport {
        private String transportType;
        private BigDecimal maxWeight;
        private BigDecimal maxVolume;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Route {
        private Point origin;
        private Point destination;
        private List<Point> waypoints;
        private Double distanceKm;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Point {
        private String city;
        private String country;
        private Double latitude;
        private Double longitude;
    }
}