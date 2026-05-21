package com.freightexchange.auth_service.service.impl;

import com.freightexchange.auth_service.domain.entity.RefreshToken;
import com.freightexchange.auth_service.domain.repository.RefreshTokenRepository;
import com.freightexchange.auth_service.exception.InvalidTokenException;
import com.freightexchange.auth_service.service.JwtService;
import com.freightexchange.auth_service.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    private final JwtService jwtService;

    @Override
    public RefreshToken createRefreshToken(UUID userId) {

        String tokenValue = jwtService.generateRefreshToken(
                userId.toString()
        );

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(userId)
                .token(tokenValue)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    @Override
    public RefreshToken getByToken(String token) {

        return refreshTokenRepository.findByToken(token)
                .orElseThrow(() ->
                        new InvalidTokenException(
                                "Refresh token not found"
                        )
                );
    }

    @Override
    public boolean isValid(RefreshToken refreshToken) {

        if (refreshToken.isRevoked()) {
            return false;
        }

        if (refreshToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }

        return jwtService.isTokenValid(
                refreshToken.getToken()
        );
    }

    @Override
    public void revokeToken(RefreshToken refreshToken) {

        refreshToken.setRevoked(true);

        refreshTokenRepository.save(refreshToken);
    }
}