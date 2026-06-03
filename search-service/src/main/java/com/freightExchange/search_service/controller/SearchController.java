package com.freightExchange.search_service.controller;

import com.freightExchange.search_service.domain.enums.ListingType;
import com.freightExchange.search_service.dto.request.SearchRequest;
import com.freightExchange.search_service.dto.response.SearchResponse;
import com.freightExchange.search_service.service.SearchService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Validated
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/listings")
    public SearchResponse searchListings(
            @RequestParam(required = false) ListingType type,

            @RequestParam(required = false) String origin,

            @RequestParam(required = false) String destination,

            @RequestParam(required = false) String cargoType,

            @RequestParam(required = false) BigDecimal minWeight,

            @RequestParam(required = false) BigDecimal maxWeight,

            @RequestParam(required = false) BigDecimal minVolume,

            @RequestParam(required = false) BigDecimal maxVolume,

            @RequestParam(defaultValue = "0")
            @Min(0)
            Integer page,

            @RequestParam(defaultValue = "20")
            @Min(1)
            @Max(100)
            Integer size,

            @RequestParam(required = false)
            String sort,

            @RequestParam(required = false)
            String order
    ) {

        SearchRequest request = SearchRequest.builder()
                .type(type)
                .origin(origin)
                .destination(destination)
                .cargoType(cargoType)
                .minWeight(minWeight)
                .maxWeight(maxWeight)
                .minVolume(minVolume)
                .maxVolume(maxVolume)
                .page(page)
                .size(size)
                .sort(sort)
                .order(order)
                .build();

        return searchService.search(request);
    }
}