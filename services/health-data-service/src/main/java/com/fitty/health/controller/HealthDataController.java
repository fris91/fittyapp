package com.fitty.health.controller;

import com.fitty.health.dto.HealthDtos.HealthSnapshotRequest;
import com.fitty.health.dto.HealthDtos.HealthSnapshotResponse;
import com.fitty.health.dto.HealthDtos.ProviderPlaceholder;
import com.fitty.health.service.HealthDataService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/health-data")
public class HealthDataController {
    private final HealthDataService service;

    public HealthDataController(HealthDataService service) {
        this.service = service;
    }

    @PostMapping
    HealthSnapshotResponse create(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId, @Valid @RequestBody HealthSnapshotRequest request) {
        return service.create(userId, request);
    }

    @GetMapping("/latest")
    HealthSnapshotResponse latest(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId) {
        return service.latest(userId);
    }

    @GetMapping("/history")
    List<HealthSnapshotResponse> history(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId) {
        return service.history(userId);
    }

    @GetMapping("/providers")
    List<ProviderPlaceholder> providers() {
        return service.providers();
    }
}
