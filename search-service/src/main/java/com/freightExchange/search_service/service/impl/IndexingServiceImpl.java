package com.freightExchange.search_service.service.impl;

import com.freightExchange.search_service.domain.entity.SearchListing;
import com.freightExchange.search_service.domain.repository.SearchListingRepository;
import com.freightExchange.search_service.dto.event.ListingCreatedEvent;
import com.freightExchange.search_service.dto.event.ListingDeletedEvent;
import com.freightExchange.search_service.dto.event.ListingPublishedEvent;
import com.freightExchange.search_service.dto.event.ListingUpdatedEvent;
import com.freightExchange.search_service.exception.SearchException;
import com.freightExchange.search_service.service.IndexingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class IndexingServiceImpl implements IndexingService {

    private final SearchListingRepository repository;

    @Override
    public void handleListingCreated(ListingCreatedEvent event) {

        validateId(event.getId());

        SearchListing listing = SearchListing.builder()
                .id(event.getId())
                .type(event.getType())
                .title(event.getTitle())
                .origin(event.getOrigin())
                .destination(event.getDestination())
                .cargoType(event.getCargoType())
                .weight(event.getWeight())
                .volume(event.getVolume())
                .status(event.getStatus())
                .createdAt(event.getCreatedAt())
                .build();

        repository.save(listing);
    }

    @Override
    public void handleListingUpdated(ListingUpdatedEvent event) {

        validateId(event.getId());

        SearchListing listing = repository.findById(event.getId())
                .orElseThrow(() ->
                        new SearchException(
                                "Listing not found: " + event.getId()
                        )
                );

        listing.setType(event.getType());
        listing.setTitle(event.getTitle());
        listing.setOrigin(event.getOrigin());
        listing.setDestination(event.getDestination());
        listing.setCargoType(event.getCargoType());
        listing.setWeight(event.getWeight());
        listing.setVolume(event.getVolume());
        listing.setStatus(event.getStatus());

        repository.save(listing);
    }

    @Override
    public void handleListingPublished(ListingPublishedEvent event) {

        validateId(event.getId());

        SearchListing listing = SearchListing.builder()
                .id(event.getId())
                .type(event.getType())
                .title(event.getTitle())
                .origin(event.getOrigin())
                .destination(event.getDestination())
                .cargoType(event.getCargoType())
                .weight(event.getWeight())
                .volume(event.getVolume())
                .status(event.getStatus())
                .createdAt(event.getCreatedAt())
                .build();

        repository.save(listing);
    }

    @Override
    public void handleListingDeleted(ListingDeletedEvent event) {

        validateId(event.getId());

        repository.deleteById(event.getId());
    }

    private void validateId(java.util.UUID id) {

        if (id == null) {
            throw new SearchException("Listing id cannot be null");
        }
    }
}