package com.freightexchange.auth_service.service;

import java.util.Map;

public interface JwtService {

    String generateAccessToken(String userId, String email, String role);

    String generateRefreshToken(String userId);

    boolean isTokenValid(String token);

    String extractUserId(String token);

    String extractEmail(String token);

    String extractRole(String token);
}