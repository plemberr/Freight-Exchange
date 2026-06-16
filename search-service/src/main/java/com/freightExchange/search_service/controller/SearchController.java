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

            // ---------- Фильтры груза (CARGO) ----------

            @RequestParam(required = false) String cargoType,

            @RequestParam(required = false) BigDecimal minWeight,

            @RequestParam(required = false) BigDecimal maxWeight,

            @RequestParam(required = false) BigDecimal minVolume,

            @RequestParam(required = false) BigDecimal maxVolume,

            @RequestParam(required = false) BigDecimal minPrice,

            @RequestParam(required = false) BigDecimal maxPrice,

            @RequestParam(required = false) BigDecimal minLength,

            @RequestParam(required = false) BigDecimal maxLength,

            @RequestParam(required = false) BigDecimal minWidth,

            @RequestParam(required = false) BigDecimal maxWidth,

            @RequestParam(required = false) BigDecimal minHeight,

            @RequestParam(required = false) BigDecimal maxHeight,

            // ---------- Фильтры транспорта (TRANSPORT) ----------

            @RequestParam(required = false) String transportType,

            @RequestParam(required = false) BigDecimal minMaxWeight,

            @RequestParam(required = false) BigDecimal maxMaxWeight,

            @RequestParam(required = false) BigDecimal minMaxVolume,

            @RequestParam(required = false) BigDecimal maxMaxVolume,

            // ---------- Пагинация и сортировка ----------

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
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .minLength(minLength)
                .maxLength(maxLength)
                .minWidth(minWidth)
                .maxWidth(maxWidth)
                .minHeight(minHeight)
                .maxHeight(maxHeight)
                .transportType(transportType)
                .minMaxWeight(minMaxWeight)
                .maxMaxWeight(maxMaxWeight)
                .minMaxVolume(minMaxVolume)
                .maxMaxVolume(maxMaxVolume)
                .page(page)
                .size(size)
                .sort(sort)
                .order(order)
                .build();

        return searchService.search(request);
    }
}
