package com.freightexchange.moderation_service.controller;

import com.freightexchange.moderation_service.domain.enums.ModerationStatus;
import com.freightexchange.moderation_service.dto.request.RejectRequest;
import com.freightexchange.moderation_service.dto.response.ModerationItem;
import com.freightexchange.moderation_service.service.ModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/moderation")
@RequiredArgsConstructor
public class ModerationController {

    private final ModerationService moderationService;

    @GetMapping("/queue")
    @ResponseStatus(HttpStatus.OK)
    public List<ModerationItem> getQueue(
            @RequestParam(required = false)
            ModerationStatus status
    ) {

        return moderationService.getQueue(status);
    }

    @PostMapping("/{listingId}/approve")
    @ResponseStatus(HttpStatus.OK)
    public void approveListing(
            @PathVariable UUID listingId
    ) {

        moderationService.approveListing(listingId);
    }

    @PostMapping("/{listingId}/reject")
    @ResponseStatus(HttpStatus.OK)
    public void rejectListing(
            @PathVariable UUID listingId,
            @RequestBody RejectRequest request
    ) {

        moderationService.rejectListing(listingId, request);
    }

}