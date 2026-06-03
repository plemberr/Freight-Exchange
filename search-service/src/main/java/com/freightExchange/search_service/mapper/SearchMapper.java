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
                .weight(entity.getWeight())
                .volume(entity.getVolume())
                .cargoType(entity.getCargoType())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}