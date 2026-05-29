package com.freightexchange.auth_service.integration.kafka.producer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freightexchange.auth_service.dto.event.UserRegisteredEvent;
import com.freightexchange.auth_service.integration.kafka.KafkaTopics;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void publishUserRegistered(UserRegisteredEvent event) {

        try {
            String payload = objectMapper.writeValueAsString(event);

            System.out.println("Sending kafka event: " + payload);

            kafkaTemplate.send(
                    KafkaTopics.USER_REGISTERED,
                    event.getUserId().toString(),
                    payload
            );

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize UserRegisteredEvent", e);
        }
    }
}