package com.freightexchange.auth_service.service.impl;

import com.freightexchange.auth_service.domain.entity.RefreshToken;
import com.freightexchange.auth_service.domain.entity.User;
import com.freightexchange.auth_service.dto.event.UserRegisteredEvent;
import com.freightexchange.auth_service.dto.request.LoginRequest;
import com.freightexchange.auth_service.dto.request.RefreshRequest;
import com.freightexchange.auth_service.dto.request.RegisterRequest;
import com.freightexchange.auth_service.dto.response.AuthResponse;
import com.freightexchange.auth_service.exception.InvalidCredentialsException;
import com.freightexchange.auth_service.exception.InvalidTokenException;
import com.freightexchange.auth_service.exception.UserAlreadyExistsException;
import com.freightexchange.auth_service.integration.kafka.producer.UserEventProducer;
import com.freightexchange.auth_service.service.AuthService;
import com.freightexchange.auth_service.service.JwtService;
import com.freightexchange.auth_service.service.RefreshTokenService;
import com.freightexchange.auth_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserService userService;
    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final UserEventProducer userEventProducer;

    @Override
    public AuthResponse register(RegisterRequest request) {

        if (userService.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("User already exists");
        }

        User user = userService.createUser(
                request.getEmail(),
                request.getPassword()
        );

        String email = user.getEmail();
        String nameFromEmail = (email != null && email.contains("@"))
                ? email.substring(0, email.indexOf("@"))
                : email;

        String accessToken = jwtService.generateAccessToken(
                user.getId().toString(),
                user.getEmail(),
                user.getRole().name()
        );

        RefreshToken refreshToken =
                refreshTokenService.createRefreshToken(user.getId());

        UserRegisteredEvent event = UserRegisteredEvent.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .name(nameFromEmail)
                .role(user.getRole().name())
                .registeredAt(LocalDateTime.now())
                .build();

        userEventProducer.publishUserRegistered(event);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {

        User user = userService.getByEmail(request.getEmail());

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPasswordHash()
        )) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String accessToken = jwtService.generateAccessToken(
                user.getId().toString(),
                user.getEmail(),
                user.getRole().name()
        );

        RefreshToken refreshToken =
                refreshTokenService.createRefreshToken(user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .build();
    }

    @Override
    public AuthResponse refresh(RefreshRequest request) {

        RefreshToken refreshToken =
                refreshTokenService.getByToken(request.getRefreshToken());

        if (!refreshTokenService.isValid(refreshToken)) {
            throw new InvalidTokenException("Invalid refresh token");
        }

        User user = userService.getById(refreshToken.getUserId());

        String newAccessToken =
                jwtService.generateAccessToken(
                        user.getId().toString(),
                        user.getEmail(),
                        user.getRole().name()
                );

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .build();
    }

    @Override
    public void logout(RefreshRequest request) {

        RefreshToken refreshToken =
                refreshTokenService.getByToken(request.getRefreshToken());

        refreshTokenService.revokeToken(refreshToken);
    }
}