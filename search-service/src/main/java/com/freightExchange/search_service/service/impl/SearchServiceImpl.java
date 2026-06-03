package com.freightExchange.search_service.service.impl;

import com.freightExchange.search_service.domain.entity.SearchListing;
import com.freightExchange.search_service.domain.repository.SearchListingRepository;
import com.freightExchange.search_service.dto.request.SearchRequest;
import com.freightExchange.search_service.dto.response.ListingSearchItem;
import com.freightExchange.search_service.dto.response.SearchResponse;
import com.freightExchange.search_service.mapper.SearchMapper;
import com.freightExchange.search_service.service.SearchService;
import com.freightExchange.search_service.specification.ListingSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private final SearchListingRepository repository;
    private final SearchMapper mapper;

    @Override
    public SearchResponse search(SearchRequest request) {

        Pageable pageable = buildPageable(request);

        Specification<SearchListing> specification =
                ListingSpecification.byFilters(request);

        Page<SearchListing> page =
                repository.findAll(specification, pageable);

        List<ListingSearchItem> items = page.getContent()
                .stream()
                .map(mapper::toListingSearchItem)
                .toList();

        return SearchResponse.builder()
                .total(page.getTotalElements())
                .page(page.getNumber())
                .size(page.getSize())
                .items(items)
                .build();
    }

    private Pageable buildPageable(SearchRequest request) {

        String sortField = resolveSortField(request.getSort());

        Sort.Direction direction =
                "asc".equalsIgnoreCase(request.getOrder())
                        ? Sort.Direction.ASC
                        : Sort.Direction.DESC;

        return PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(direction, sortField)
        );
    }

    private String resolveSortField(String sort) {

        if (sort == null || sort.isBlank()) {
            return "createdAt";
        }

        return switch (sort) {
            case "weight" -> "weight";
            case "volume" -> "volume";
            case "createdAt" -> "createdAt";
            default -> "createdAt";
        };
    }
}