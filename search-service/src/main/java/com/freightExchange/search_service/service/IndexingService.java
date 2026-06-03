package com.freightExchange.search_service.service;

import com.freightExchange.search_service.dto.event.ListingCreatedEvent;
import com.freightExchange.search_service.dto.event.ListingDeletedEvent;
import com.freightExchange.search_service.dto.event.ListingPublishedEvent;
import com.freightExchange.search_service.dto.event.ListingUpdatedEvent;

public interface IndexingService {

    void handleListingCreated(ListingCreatedEvent event);

    void handleListingUpdated(ListingUpdatedEvent event);

    void handleListingPublished(ListingPublishedEvent event);

    void handleListingDeleted(ListingDeletedEvent event);

}