package com.freightExchange.search_service.service;

import java.util.List;

public interface SuggestionService {

    List<String> getSuggestions(String query);

}