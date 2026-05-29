package com.freightexchange.auth_service.integration.kafka.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freightexchange.auth_service.dto.event.UserDeletedEvent;
import com.freightexchange.auth_service.domain.repository.RefreshTokenRepository;
import com.freightexchange.auth_service.domain.repository.UserRepository;
import com.freightexchange.auth_service.integration.kafka.KafkaTopics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserDeletedConsumer {

    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @KafkaListener(
            topics = KafkaTopics.USER_DELETED,
            groupId = "auth-service-group"
    )
    @Transactional
    public void consume(String message) {

        try {

            UserDeletedEvent event =
                    objectMapper.readValue(
                            message,
                            UserDeletedEvent.class
                    );

            log.info("User delete event received: {}", event.getUserId());

            refreshTokenRepository.deleteByUserId(
                    event.getUserId()
            );

            userRepository.deleteById(
                    event.getUserId()
            );

            log.info(
                    "User {} deleted from auth-service",
                    event.getUserId()
            );

        } catch (Exception e) {

            log.error(
                    "Failed to process delete event",
                    e
            );

            throw new RuntimeException(e);
        }
    }
}