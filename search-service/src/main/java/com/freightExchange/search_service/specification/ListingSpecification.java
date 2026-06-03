package com.freightExchange.search_service.specification;

import com.freightExchange.search_service.domain.entity.SearchListing;
import com.freightExchange.search_service.domain.enums.ListingStatus;
import com.freightExchange.search_service.dto.request.SearchRequest;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class ListingSpecification {

    private ListingSpecification() {
    }

    public static Specification<SearchListing> byFilters(SearchRequest request) {

        return (root, query, criteriaBuilder) -> {

            List<Predicate> predicates = new ArrayList<>();

            predicates.add(
                    criteriaBuilder.equal(
                            root.get("status"),
                            ListingStatus.PUBLISHED
                    )
            );

            if (request.getType() != null) {
                predicates.add(
                        criteriaBuilder.equal(
                                root.get("type"),
                                request.getType()
                        )
                );
            }

            if (request.getOrigin() != null && !request.getOrigin().isBlank()) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("origin")),
                                "%" + request.getOrigin().toLowerCase() + "%"
                        )
                );
            }

            if (request.getDestination() != null && !request.getDestination().isBlank()) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("destination")),
                                "%" + request.getDestination().toLowerCase() + "%"
                        )
                );
            }

            if (request.getCargoType() != null && !request.getCargoType().isBlank()) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("cargoType")),
                                "%" + request.getCargoType().toLowerCase() + "%"
                        )
                );
            }

            if (request.getMinWeight() != null) {
                predicates.add(
                        criteriaBuilder.greaterThanOrEqualTo(
                                root.get("weight"),
                                request.getMinWeight()
                        )
                );
            }

            if (request.getMaxWeight() != null) {
                predicates.add(
                        criteriaBuilder.lessThanOrEqualTo(
                                root.get("weight"),
                                request.getMaxWeight()
                        )
                );
            }

            if (request.getMinVolume() != null) {
                predicates.add(
                        criteriaBuilder.greaterThanOrEqualTo(
                                root.get("volume"),
                                request.getMinVolume()
                        )
                );
            }

            if (request.getMaxVolume() != null) {
                predicates.add(
                        criteriaBuilder.lessThanOrEqualTo(
                                root.get("volume"),
                                request.getMaxVolume()
                        )
                );
            }

            return criteriaBuilder.and(
                    predicates.toArray(new Predicate[0])
            );
        };
    }
}