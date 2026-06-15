package com.freightexchange.moderation_service.domain.entity;

import com.freightexchange.moderation_service.domain.enums.ModerationStatus;
import com.freightexchange.moderation_service.dto.listing.CargoDto;
import com.freightexchange.moderation_service.dto.listing.RouteDto;
import com.freightexchange.moderation_service.dto.listing.TransportDto;

import io.hypersistence.utils.hibernate.type.json.JsonType;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "moderation_queue")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerationQueueItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "listing_id", nullable = false, unique = true)
    private UUID listingId;

    @Column(name = "listing_title", nullable = false)
    private String listingTitle;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ModerationStatus status;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "listing_type")
    private String type;

    @Type(JsonType.class)
    @Column(name = "cargo", columnDefinition = "jsonb")
    private CargoDto cargo;

    @Type(JsonType.class)
    @Column(name = "transport", columnDefinition = "jsonb")
    private TransportDto transport;

    @Type(JsonType.class)
    @Column(name = "route", columnDefinition = "jsonb")
    private RouteDto route;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}