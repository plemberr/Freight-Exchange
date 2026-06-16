package com.freightExchange.search_service.specification;

import com.freightExchange.search_service.domain.entity.SearchListing;
import com.freightExchange.search_service.domain.enums.ListingStatus;
import com.freightExchange.search_service.dto.request.SearchRequest;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
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
                            ListingStatus.ACTIVE
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

            // ===================== Фильтры груза (CARGO) =====================

            if (request.getCargoType() != null && !request.getCargoType().isBlank()) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("cargoType")),
                                "%" + request.getCargoType().toLowerCase() + "%"
                        )
                );
            }

            addRange(predicates, criteriaBuilder, root.get("weight"),
                    request.getMinWeight(), request.getMaxWeight());

            addRange(predicates, criteriaBuilder, root.get("volume"),
                    request.getMinVolume(), request.getMaxVolume());

            addRange(predicates, criteriaBuilder, root.get("price"),
                    request.getMinPrice(), request.getMaxPrice());

            addRange(predicates, criteriaBuilder, root.get("length"),
                    request.getMinLength(), request.getMaxLength());

            addRange(predicates, criteriaBuilder, root.get("width"),
                    request.getMinWidth(), request.getMaxWidth());

            addRange(predicates, criteriaBuilder, root.get("height"),
                    request.getMinHeight(), request.getMaxHeight());

            // ==================== Фильтры транспорта (TRANSPORT) ====================

            if (request.getTransportType() != null && !request.getTransportType().isBlank()) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("transportType")),
                                "%" + request.getTransportType().toLowerCase() + "%"
                        )
                );
            }

            // диапазон по полю maxWeight (максимальная грузоподъёмность транспорта)
            addRange(predicates, criteriaBuilder, root.get("maxWeight"),
                    request.getMinMaxWeight(), request.getMaxMaxWeight());

            // диапазон по полю maxVolume (максимальный объём транспорта)
            addRange(predicates, criteriaBuilder, root.get("maxVolume"),
                    request.getMinMaxVolume(), request.getMaxMaxVolume());

            return criteriaBuilder.and(
                    predicates.toArray(new Predicate[0])
            );
        };
    }

    /**
     * Добавляет в список предикатов условие "ОТ-ДО" (BETWEEN) для числового поля.
     * Если min/max не заданы — соответствующая граница не применяется.
     * Если у сущности значение поля null (например, фильтр по объёму у транспорта,
     * у которого колонка volume не заполняется), запись будет корректно исключена
     * из результата, так как сравнение с NULL в SQL не проходит.
     */
    private static void addRange(
            List<Predicate> predicates,
            CriteriaBuilder criteriaBuilder,
            Path<BigDecimal> path,
            BigDecimal min,
            BigDecimal max
    ) {

        if (min != null) {
            predicates.add(
                    criteriaBuilder.greaterThanOrEqualTo(path, min)
            );
        }

        if (max != null) {
            predicates.add(
                    criteriaBuilder.lessThanOrEqualTo(path, max)
            );
        }
    }
}
