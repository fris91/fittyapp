package com.fitty.identity.service;

import com.fitty.identity.config.IdentityProperties;
import com.fitty.identity.dto.IdentityDtos.RegisterRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class UserProfileClient {
    private final RestClient restClient;
    private final IdentityProperties properties;

    public UserProfileClient(RestClient restClient, IdentityProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public String createProfile(String keycloakUserId, RegisterRequest request) {
        Map<String, Object> payload = Map.of(
                "id", keycloakUserId,
                "firstName", request.firstName(),
                "lastName", request.lastName(),
                "email", request.email(),
                "role", "FITTY_USER",
                "subscriptionPlan", request.subscriptionPlan() == null ? "FREE" : request.subscriptionPlan()
        );

        return restClient.post()
                .uri("{base}/api/v1/user-service", properties.userService().url())
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);
    }
}
