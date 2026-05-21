package com.freightexchange.auth_service.dto.event;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class UserRegisteredEvent {

    private UUID userId;

    private String email;

    private String role;

    private LocalDateTime registeredAt;
}