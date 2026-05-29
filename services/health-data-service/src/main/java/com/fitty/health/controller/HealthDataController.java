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
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequestMapping("/api/v1/health-data")
public class HealthDataController {
    private final HealthDataService service;

    public HealthDataController(HealthDataService service) {
        this.service = service;
    }

    @PostMapping
    HealthSnapshotResponse create(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId,
                                  @RequestHeader(value = "X-User-Roles", defaultValue = "") String roles,
                                  @Valid @RequestBody HealthSnapshotRequest request) {
        rejectAdminOnlyAccess(roles);
        return service.create(userId, request);
    }

    @GetMapping("/latest")
    HealthSnapshotResponse latest(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId,
                                  @RequestHeader(value = "X-User-Roles", defaultValue = "") String roles) {
        rejectAdminOnlyAccess(roles);
        return service.latest(userId);
    }

    @GetMapping("/history")
    List<HealthSnapshotResponse> history(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId,
                                         @RequestHeader(value = "X-User-Roles", defaultValue = "") String roles) {
        rejectAdminOnlyAccess(roles);
        return service.history(userId);
    }

    @GetMapping("/providers")
    List<ProviderPlaceholder> providers() {
        return service.providers();
    }

    private void rejectAdminOnlyAccess(String roles) {
        boolean isAdmin = List.of(roles.split(",")).contains("FITTY_ADMIN");
        boolean isUser = List.of(roles.split(",")).contains("FITTY_USER");
        if (isAdmin && !isUser) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admins cannot access sensitive health measurements");
        }
    }
}
