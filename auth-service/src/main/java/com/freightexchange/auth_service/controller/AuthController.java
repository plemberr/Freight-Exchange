package com.freightexchange.auth_service.controller;

import com.freightexchange.auth_service.dto.request.LoginRequest;
import com.freightexchange.auth_service.dto.request.RefreshRequest;
import com.freightexchange.auth_service.dto.request.RegisterRequest;
import com.freightexchange.auth_service.dto.response.AuthResponse;
import com.freightexchange.auth_service.dto.response.UserInfoResponse;
import com.freightexchange.auth_service.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request
    ) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(
            @Valid @RequestBody RefreshRequest request
    ) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public void logout(
            @Valid @RequestBody RefreshRequest request
    ) {
        authService.logout(request);
    }
}