package com.freightexchange.auth_service.dto.event;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class UserRoleChangedEvent {

    private UUID userId;

    private String oldRole;

    private String newRole;

    private LocalDateTime changedAt;
}