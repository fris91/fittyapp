package com.fitty.identity.service;

import com.fitty.identity.config.IdentityProperties;
import com.fitty.identity.dto.IdentityDtos.RegisterRequest;
import com.fitty.identity.dto.IdentityDtos.TokenResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Component
public class KeycloakClient {
    private final RestClient restClient;
    private final IdentityProperties properties;

    public KeycloakClient(RestClient restClient, IdentityProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public String createUser(RegisterRequest request) {
        String adminToken = adminToken();
        String existingUserId = findUserIdByEmail(request.email(), adminToken);
        Map<String, Object> payload = Map.of(
                "username", request.email(),
                "email", request.email(),
                "firstName", request.firstName(),
                "lastName", request.lastName(),
                "enabled", true,
                "emailVerified", request.socialIdentity() != null,
                "attributes", attributes(request)
        );

        String userId;
        if (existingUserId == null) {
            URI location = restClient.post()
                    .uri(keycloakUri("/admin/realms/{realm}/users", properties.keycloak().realm()))
                    .headers(headers -> headers.setBearerAuth(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .getHeaders()
                    .getLocation();

            if (location == null) {
                throw new IllegalStateException("Keycloak did not return a user location");
            }
            userId = location.getPath().substring(location.getPath().lastIndexOf('/') + 1);
        } else {
            userId = existingUserId;
            restClient.put()
                    .uri(keycloakUri("/admin/realms/{realm}/users/{userId}", properties.keycloak().realm(), userId))
                    .headers(headers -> headers.setBearerAuth(adminToken))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        }
        if (request.password() != null && !request.password().isBlank()) {
            setPassword(userId, request.password(), adminToken);
        }
        assignRealmRole(userId, "FITTY_USER", adminToken);
        return userId;
    }

    private String findUserIdByEmail(String email, String adminToken) {
        List<?> users = restClient.get()
                .uri(keycloakBuilder("/admin/realms/{realm}/users")
                        .queryParam("email", email)
                        .queryParam("exact", true)
                        .build(properties.keycloak().realm()))
                .headers(headers -> headers.setBearerAuth(adminToken))
                .retrieve()
                .body(List.class);
        if (users == null || users.isEmpty() || !(users.get(0) instanceof Map<?, ?> user)) {
            return null;
        }
        Object id = user.get("id");
        return id == null ? null : id.toString();
    }

    public TokenResponse token(String email, String password) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("grant_type", "password");
        form.add("client_id", properties.keycloak().tokenClientId());
        form.add("username", email);
        form.add("password", password);

        Map<?, ?> response = restClient.post()
                .uri(keycloakUri("/realms/{realm}/protocol/openid-connect/token", properties.keycloak().realm()))
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalStateException("Keycloak token endpoint returned no body");
        }
        return new TokenResponse(
                string(response.get("access_token")),
                string(response.get("refresh_token")),
                string(response.get("id_token")),
                integer(response.get("expires_in")),
                string(valueOrDefault(string(response.get("token_type")), "Bearer"))
        );
    }

    /**
     * Resolves the authenticated user's claims from Keycloak using their access token.
     * Returns sub, email, given_name and family_name. Throws if the token is invalid/expired.
     */
    public Map<?, ?> userInfo(String accessToken) {
        Map<?, ?> response = restClient.get()
                .uri(keycloakUri("/realms/{realm}/protocol/openid-connect/userinfo", properties.keycloak().realm()))
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .body(Map.class);
        if (response == null || response.get("sub") == null) {
            throw new IllegalStateException("Keycloak userinfo returned no subject");
        }
        return response;
    }

    public void sendPasswordResetEmail(String email) {
        String adminToken = adminToken();
        String userId = findUserIdByEmail(email, adminToken);
        if (userId == null) {
            return;
        }

        restClient.put()
                .uri(keycloakBuilder("/admin/realms/{realm}/users/{userId}/execute-actions-email")
                        .queryParam("client_id", properties.keycloak().webClientId())
                        .queryParam("redirect_uri", properties.keycloak().webRedirectUri())
                        .build(properties.keycloak().realm(), userId))
                .headers(headers -> headers.setBearerAuth(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of("UPDATE_PASSWORD"))
                .retrieve()
                .toBodilessEntity();
    }

    private String adminToken() {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("grant_type", "password");
        form.add("client_id", properties.keycloak().adminClientId());
        form.add("username", properties.keycloak().adminUsername());
        form.add("password", properties.keycloak().adminPassword());

        Map<?, ?> response = restClient.post()
                .uri(keycloakUri("/realms/{realm}/protocol/openid-connect/token", properties.keycloak().adminRealm()))
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(Map.class);
        if (response == null || response.get("access_token") == null) {
            throw new IllegalStateException("Could not get Keycloak admin token");
        }
        return response.get("access_token").toString();
    }

    private void setPassword(String userId, String password, String adminToken) {
        restClient.put()
                .uri(keycloakUri("/admin/realms/{realm}/users/{userId}/reset-password", properties.keycloak().realm(), userId))
                .headers(headers -> headers.setBearerAuth(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("type", "password", "value", password, "temporary", false))
                .retrieve()
                .toBodilessEntity();
    }

    private void assignRealmRole(String userId, String roleName, String adminToken) {
        Map<?, ?> role = restClient.get()
                .uri(keycloakUri("/admin/realms/{realm}/roles/{roleName}", properties.keycloak().realm(), roleName))
                .headers(headers -> headers.setBearerAuth(adminToken))
                .retrieve()
                .body(Map.class);
        if (role == null) {
            throw new IllegalStateException("Missing Keycloak realm role: " + roleName);
        }
        restClient.post()
                .uri(keycloakUri("/admin/realms/{realm}/users/{userId}/role-mappings/realm", properties.keycloak().realm(), userId))
                .headers(headers -> headers.setBearerAuth(adminToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(List.of(role))
                .retrieve()
                .toBodilessEntity();
    }

    private Map<String, List<String>> attributes(RegisterRequest request) {
        return Map.of(
                "subscriptionPlan", List.of(valueOrDefault(request.subscriptionPlan(), "FREE")),
                "locale", List.of(valueOrDefault(request.locale(), "it-IT")),
                "goals", request.goals() == null || request.goals().isEmpty() ? List.of("general wellness") : request.goals(),
                "activityLevel", List.of(request.activityProfile() == null ? "" : valueOrDefault(request.activityProfile().activityLevel(), "")),
                "connectedProvider", List.of(request.activityProfile() == null ? "" : valueOrDefault(request.activityProfile().connectedProvider(), "")),
                "wellnessDataProcessingConsent", List.of(String.valueOf(request.consent() != null && Boolean.TRUE.equals(request.consent().wellnessDataProcessing()))),
                "medicalBoundaryAccepted", List.of(String.valueOf(request.consent() != null && Boolean.TRUE.equals(request.consent().medicalBoundaryAccepted()))),
                "socialProvider", List.of(request.socialIdentity() == null ? "" : valueOrDefault(request.socialIdentity().provider(), "")),
                "socialSubject", List.of(request.socialIdentity() == null ? "" : valueOrDefault(request.socialIdentity().providerSubject(), ""))
        );
    }

    private URI keycloakUri(String path, Object... variables) {
        return keycloakBuilder(path).build(variables);
    }

    private UriComponentsBuilder keycloakBuilder(String path) {
        return UriComponentsBuilder.fromUriString(properties.keycloak().baseUrl()).path(path);
    }

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String string(Object value) {
        return value == null ? null : value.toString();
    }

    private Integer integer(Object value) {
        return value instanceof Number number ? number.intValue() : null;
    }
}
