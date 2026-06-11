CREATE INDEX idx_moderation_queue_status
    ON moderation_queue(status);

CREATE INDEX idx_moderation_queue_created_at
    ON moderation_queue(created_at);

CREATE INDEX idx_moderation_queue_owner_id
    ON moderation_queue(owner_id);