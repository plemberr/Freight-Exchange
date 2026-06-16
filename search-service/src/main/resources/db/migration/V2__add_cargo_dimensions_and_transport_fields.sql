-- Добавляем поля длины/ширины/высоты для груза (CARGO)
ALTER TABLE search_listings
    ADD COLUMN length NUMERIC(12, 2),
    ADD COLUMN width  NUMERIC(12, 2),
    ADD COLUMN height NUMERIC(12, 2);

-- Добавляем поля, специфичные для транспорта (TRANSPORT)
ALTER TABLE search_listings
    ADD COLUMN max_volume     NUMERIC(12, 2),
    ADD COLUMN max_weight     NUMERIC(12, 2),
    ADD COLUMN transport_type VARCHAR(100);

CREATE INDEX idx_search_listings_transport_type
    ON search_listings (transport_type);

CREATE INDEX idx_search_listings_max_volume
    ON search_listings (max_volume);

CREATE INDEX idx_search_listings_max_weight
    ON search_listings (max_weight);
