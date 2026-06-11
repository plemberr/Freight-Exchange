CREATE TABLE moderation_queue
(
    id BIGSERIAL PRIMARY KEY,

    listing_id UUID NOT NULL UNIQUE,

    listing_title VARCHAR(255) NOT NULL,

    owner_id UUID NOT NULL,

    status VARCHAR(32) NOT NULL,

    rejection_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);