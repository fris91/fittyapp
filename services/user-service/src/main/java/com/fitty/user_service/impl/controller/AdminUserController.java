package com.fitty.user_service.impl.controller;

import com.fitty.user_service.api.dto.UserRequest;
import com.fitty.user_service.api.dto.UserResponse;
import com.fitty.user_service.impl.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {
    private final UserService service;

    @GetMapping
    public List<UserResponse> findAll(@RequestHeader(value = "X-User-Roles", defaultValue = "") String roles) {
        requireAdmin(roles);
        return service.findAllAdminVisibleUsers();
    }

    @GetMapping("/{user-id}")
    public UserResponse findById(@RequestHeader(value = "X-User-Roles", defaultValue = "") String roles,
                                 @PathVariable("user-id") String userId) {
        requireAdmin(roles);
        return service.findAdminVisibleUserById(userId);
    }

    @PatchMapping("/{user-id}")
    public UserResponse update(@RequestHeader(value = "X-User-Roles", defaultValue = "") String roles,
                               @PathVariable("user-id") String userId,
                               @RequestBody UserRequest request) {
        requireAdmin(roles);
        return service.updateAdminVisibleUser(userId, request);
    }

    @GetMapping("/{user-id}/plans")
    public Map<String, Object> plans(@RequestHeader(value = "X-User-Roles", defaultValue = "") String roles,
                                     @PathVariable("user-id") String userId) {
        requireAdmin(roles);
        return Map.of(
                "userId", userId,
                "workoutPlans", List.of(),
                "nutritionPlans", List.of(),
                "sensitiveHealthData", "not exposed to admins"
        );
    }

    @PatchMapping("/{user-id}/subscription")
    public UserResponse updateSubscription(@RequestHeader(value = "X-User-Roles", defaultValue = "") String roles,
                                           @PathVariable("user-id") String userId,
                                           @RequestBody Map<String, String> body) {
        requireAdmin(roles);
        UserRequest request = new UserRequest(userId, null, null, null, null, body.get("subscriptionPlan"), null, null);
        return service.updateAdminVisibleUser(userId, request);
    }

    private void requireAdmin(String roles) {
        if (!List.of(roles.split(",")).contains("FITTY_ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FITTY_ADMIN role is required");
        }
    }
}
