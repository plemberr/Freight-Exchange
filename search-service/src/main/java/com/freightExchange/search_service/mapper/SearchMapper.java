package com.freightExchange.search_service.mapper;

import com.freightExchange.search_service.domain.entity.SearchListing;
import com.freightExchange.search_service.dto.response.ListingSearchItem;
import org.springframework.stereotype.Component;

@Component
public class SearchMapper {

    public ListingSearchItem toListingSearchItem(SearchListing entity) {
        if (entity == null) {
            return null;
        }

        return ListingSearchItem.builder()
                .id(entity.getId())
                .type(entity.getType())
                .title(entity.getTitle())
                .origin(entity.getOrigin())
                .destination(entity.getDestination())
                .cargoType(entity.getCargoType())
                .weight(entity.getWeight())
                .volume(entity.getVolume())
                .length(entity.getLength())
                .width(entity.getWidth())
                .height(entity.getHeight())
                .price(entity.getPrice())
                .transportType(entity.getTransportType())
                .maxVolume(entity.getMaxVolume())
                .maxWeight(entity.getMaxWeight())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}