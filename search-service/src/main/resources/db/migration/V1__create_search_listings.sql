CREATE TABLE search_listings
(
    id UUID PRIMARY KEY,

    type VARCHAR(20) NOT NULL,

    title VARCHAR(255) NOT NULL,

    origin VARCHAR(255) NOT NULL,

    destination VARCHAR(255) NOT NULL,

    cargo_type VARCHAR(100),

    weight NUMERIC(12,2),

    volume NUMERIC(12,2),

    price NUMERIC(12,2),

    distance_km DOUBLE PRECISION,

    status VARCHAR(20) NOT NULL,

    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_search_listings_type
    ON search_listings(type);

CREATE INDEX idx_search_listings_origin
    ON search_listings(origin);

CREATE INDEX idx_search_listings_destination
    ON search_listings(destination);

CREATE INDEX idx_search_listings_cargo_type
    ON search_listings(cargo_type);

CREATE INDEX idx_search_listings_status
    ON search_listings(status);

CREATE INDEX idx_search_listings_created_at
    ON search_listings(created_at);

CREATE INDEX idx_search_listings_price
    ON search_listings(price);

CREATE INDEX idx_search_listings_distance
    ON search_listings(distance_km);