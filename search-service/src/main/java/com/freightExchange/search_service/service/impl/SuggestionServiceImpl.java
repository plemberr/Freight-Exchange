package com.freightExchange.search_service.service.impl;

import com.freightExchange.search_service.domain.repository.SearchListingRepository;
import com.freightExchange.search_service.service.SuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SuggestionServiceImpl implements SuggestionService {

    private static final int MAX_SUGGESTIONS = 10;

    private final SearchListingRepository repository;

    @Override
    public List<String> getSuggestions(String query) {

        if (query == null || query.isBlank()) {
            return List.of();
        }

        LinkedHashSet<String> suggestions = new LinkedHashSet<>();

        suggestions.addAll(
                repository.findOriginSuggestions(query)
        );

        suggestions.addAll(
                repository.findDestinationSuggestions(query)
        );

        return suggestions.stream()
                .limit(MAX_SUGGESTIONS)
                .toList();
    }
}