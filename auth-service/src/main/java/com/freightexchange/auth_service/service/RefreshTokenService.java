package com.freightexchange.auth_service.service;

import com.freightexchange.auth_service.domain.entity.RefreshToken;

import java.util.UUID;

public interface RefreshTokenService {

    RefreshToken createRefreshToken(UUID userId);

    RefreshToken getByToken(String token);

    boolean isValid(RefreshToken refreshToken);

    void revokeToken(RefreshToken refreshToken);
}