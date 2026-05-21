package com.freightexchange.auth_service.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<?> health() {

        return ResponseEntity.ok(
                Map.of(
                        "status", "UP",
                        "service", "auth-service",
                        "timestamp", LocalDateTime.now()
                )
        );
    }

    @GetMapping("/live")
    public ResponseEntity<?> liveness() {

        return ResponseEntity.ok(
                Map.of(
                        "status", "LIVE"
                )
        );
    }

    @GetMapping("/ready")
    public ResponseEntity<?> readiness() {

        return ResponseEntity.ok(
                Map.of(
                        "status", "READY"
                )
        );
    }
}