CREATE TABLE moderation_queue
(
    id BIGSERIAL PRIMARY KEY,

    listing_id UUID NOT NULL UNIQUE,

    listing_title VARCHAR(255) NOT NULL,

    owner_id UUID NOT NULL,

    description TEXT,

    listing_type VARCHAR(50),

    cargo JSONB,

    transport JSONB,

    route JSONB,

    status VARCHAR(32) NOT NULL,

    rejection_reason TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_queue_status
    ON moderation_queue(status);

CREATE INDEX idx_moderation_queue_created_at
    ON moderation_queue(created_at);

CREATE INDEX idx_moderation_queue_owner_id
    ON moderation_queue(owner_id);