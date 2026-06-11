package com.freightexchange.moderation_service.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.stereotype.Service;

import java.security.PublicKey;
import java.util.List;

@Service
public class JwtService {

    private final PublicKey publicKey;

    public JwtService(PublicKey publicKey) {
        this.publicKey = publicKey;
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(publicKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public List<String> extractRoles(String token) {

        Claims claims = extractAllClaims(token);
    
        String role = claims.get("role", String.class);
    
        if (role == null) {
            return List.of();
        }
    
        return List.of(role);
    }

    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}