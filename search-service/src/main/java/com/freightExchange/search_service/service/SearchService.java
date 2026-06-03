package com.freightExchange.search_service.service;

import com.freightExchange.search_service.dto.request.SearchRequest;
import com.freightExchange.search_service.dto.response.SearchResponse;

public interface SearchService {

    SearchResponse search(SearchRequest request);

}