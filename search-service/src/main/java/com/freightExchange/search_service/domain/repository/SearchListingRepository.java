package com.freightExchange.search_service.domain.repository;

import com.freightExchange.search_service.domain.entity.SearchListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface SearchListingRepository
        extends JpaRepository<SearchListing, UUID>,
        JpaSpecificationExecutor<SearchListing> {

    @Query("""
            SELECT DISTINCT s.origin
            FROM SearchListing s
            WHERE LOWER(s.origin)
                  LIKE LOWER(CONCAT(:query, '%'))
            ORDER BY s.origin
            """)
    List<String> findOriginSuggestions(String query);

    @Query("""
            SELECT DISTINCT s.destination
            FROM SearchListing s
            WHERE LOWER(s.destination)
                  LIKE LOWER(CONCAT(:query, '%'))
            ORDER BY s.destination
            """)
    List<String> findDestinationSuggestions(String query);

}