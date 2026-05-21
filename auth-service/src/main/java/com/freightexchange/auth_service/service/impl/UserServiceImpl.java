package com.freightexchange.auth_service.service.impl;

import com.freightexchange.auth_service.domain.entity.User;
import com.freightexchange.auth_service.domain.enums.UserRole;
import com.freightexchange.auth_service.domain.repository.UserRepository;
import com.freightexchange.auth_service.exception.InvalidCredentialsException;
import com.freightexchange.auth_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public User createUser(String email, String password) {

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(UserRole.ROLE_USER)
                .isActive(true)
                .build();

        return userRepository.save(user);
    }

    @Override
    public User getByEmail(String email) {

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new InvalidCredentialsException("User not found")
                );
    }

    @Override
    public User getById(UUID id) {

        return userRepository.findById(id)
                .orElseThrow(() ->
                        new InvalidCredentialsException("User not found")
                );
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}