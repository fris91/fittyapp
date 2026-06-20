package com.fitty.identity.service;

import com.fitty.identity.config.IdentityProperties;
import com.fitty.identity.dto.IdentityDtos.RegisterRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
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
        return createProfile(
                keycloakUserId,
                request.firstName(),
                request.lastName(),
                request.email(),
                request.subscriptionPlan() == null ? "FREE" : request.subscriptionPlan());
    }

    public String createProfile(String keycloakUserId, String firstName, String lastName, String email, String plan) {
        Map<String, Object> payload = Map.of(
                "id", keycloakUserId,
                "firstName", firstName == null ? "" : firstName,
                "lastName", lastName == null ? "" : lastName,
                "email", email == null ? "" : email,
                "role", "FITTY_USER",
                "subscriptionPlan", plan == null ? "FREE" : plan
        );

        return restClient.post()
                .uri(userServiceUri())
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);
    }

    /** Returns true if a Fitty profile already exists for the given Keycloak user id. */
    public boolean exists(String keycloakUserId) {
        Boolean exists = restClient.get()
                .uri(UriComponentsBuilder.fromUriString(properties.userService().url())
                        .path("/api/v1/user-service/exists/{id}")
                        .build(keycloakUserId))
                .retrieve()
                .body(Boolean.class);
        return Boolean.TRUE.equals(exists);
    }

    private URI userServiceUri() {
        return UriComponentsBuilder.fromUriString(properties.userService().url())
                .path("/api/v1/user-service")
                .build()
                .toUri();
    }
}
