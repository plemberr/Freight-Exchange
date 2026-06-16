package com.freightExchange.search_service.service.impl;

import com.freightExchange.search_service.domain.entity.SearchListing;
import com.freightExchange.search_service.domain.enums.ListingStatus;
import com.freightExchange.search_service.domain.enums.ListingType;
import com.freightExchange.search_service.domain.repository.SearchListingRepository;
import com.freightExchange.search_service.dto.event.ListingDeletedEvent;
import com.freightExchange.search_service.dto.event.ListingPublishedEvent;
import com.freightExchange.search_service.dto.event.ListingUpdatedEvent;
import com.freightExchange.search_service.exception.SearchException;
import com.freightExchange.search_service.service.IndexingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class IndexingServiceImpl implements IndexingService {

    private final SearchListingRepository repository;

    @Override
    public void handleListingUpdated(ListingUpdatedEvent event) {

        validateId(event.getId());

        SearchListing listing = repository.findById(event.getId())
                .orElseThrow(() ->
                        new SearchException("Listing not found: " + event.getId())
                );

        listing.setType(event.getType());
        listing.setTitle(event.getTitle());
        listing.setOrigin(event.getOrigin());
        listing.setDestination(event.getDestination());
        listing.setCargoType(event.getCargoType());
        listing.setWeight(event.getWeight());
        listing.setVolume(event.getVolume());
        listing.setPrice(event.getPrice());
        listing.setLength(event.getLength());
        listing.setWidth(event.getWidth());
        listing.setHeight(event.getHeight());
        listing.setTransportType(event.getTransportType());
        listing.setMaxVolume(event.getMaxVolume());
        listing.setMaxWeight(event.getMaxWeight());
        listing.setDistanceKm(event.getDistanceKm());
        listing.setStatus(event.getStatus());

        repository.save(listing);
    }

    @Override
    public void handleListingPublished(ListingPublishedEvent event) {

        SearchListing listing = SearchListing.builder()
                .id(event.getListingId())

                .type(ListingType.valueOf(event.getType()))
                .status(ListingStatus.valueOf(event.getStatus()))

                .title(event.getTitle())

                .origin(event.getRoute() != null && event.getRoute().getOrigin() != null
                        ? event.getRoute().getOrigin().getCity()
                        : null)

                .destination(event.getRoute() != null && event.getRoute().getDestination() != null
                        ? event.getRoute().getDestination().getCity()
                        : null)

                .cargoType(event.getCargo() != null
                        ? event.getCargo().getCargoType()
                        : null)

                .weight(event.getCargo() != null
                        ? event.getCargo().getWeight()
                        : null)

                .volume(event.getCargo() != null
                        ? event.getCargo().getVolume()
                        : null)

                .length(event.getCargo() != null
                        ? event.getCargo().getLength()
                        : null)

                .width(event.getCargo() != null
                        ? event.getCargo().getWidth()
                        : null)

                .height(event.getCargo() != null
                        ? event.getCargo().getHeight()
                        : null)

                .price(event.getCargo() != null
                        ? event.getCargo().getPrice()
                        : null)

                .transportType(event.getTransport() != null
                        ? event.getTransport().getTransportType()
                        : null)

                .maxVolume(event.getTransport() != null
                        ? event.getTransport().getMaxVolume()
                        : null)

                .maxWeight(event.getTransport() != null
                        ? event.getTransport().getMaxWeight()
                        : null)

                .distanceKm(event.getRoute() != null
                        ? event.getRoute().getDistanceKm()
                        : null)

                .createdAt(LocalDateTime.now())
                .build();

        repository.save(listing);
    }

    @Override
    public void handleListingDeleted(ListingDeletedEvent event) {

        validateId(event.getListingId());

        repository.deleteById(event.getListingId());
    }

    private void validateId(java.util.UUID id) {
        if (id == null) {
            throw new SearchException("Listing id cannot be null");
        }
    }
}