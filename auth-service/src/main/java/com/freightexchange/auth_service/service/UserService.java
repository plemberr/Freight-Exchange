package com.freightexchange.auth_service.service;

import com.freightexchange.auth_service.domain.entity.User;

import java.util.UUID;

public interface UserService {

    User createUser(String email, String password);

    User getByEmail(String email);

    User getById(UUID id);

    boolean existsByEmail(String email);
}