package com.freightexchange.auth_service.service;

import com.freightexchange.auth_service.dto.request.LoginRequest;
import com.freightexchange.auth_service.dto.request.RefreshRequest;
import com.freightexchange.auth_service.dto.request.RegisterRequest;
import com.freightexchange.auth_service.dto.response.AuthResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(RefreshRequest request);

    void logout(RefreshRequest request);
}