package com.fitty.identity.service;

import com.fitty.identity.dto.IdentityDtos.IdentityResponse;
import com.fitty.identity.dto.IdentityDtos.LoginRequest;
import com.fitty.identity.dto.IdentityDtos.PasswordResetRequest;
import com.fitty.identity.dto.IdentityDtos.RegisterRequest;
import com.fitty.identity.dto.IdentityDtos.SyncProfileResponse;
import com.fitty.identity.dto.IdentityDtos.TokenResponse;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class IdentityService {
    private final KeycloakClient keycloakClient;
    private final UserProfileClient userProfileClient;

    public IdentityService(KeycloakClient keycloakClient, UserProfileClient userProfileClient) {
        this.keycloakClient = keycloakClient;
        this.userProfileClient = userProfileClient;
    }

    public IdentityResponse register(RegisterRequest request) {
        String keycloakUserId = keycloakClient.createUser(request);
        String appUserId = userProfileClient.createProfile(keycloakUserId, request);
        TokenResponse token = request.password() == null || request.password().isBlank()
                ? null
                : keycloakClient.token(request.email(), request.password());
        return new IdentityResponse(
                keycloakUserId,
                appUserId,
                request.email(),
                request.firstName(),
                request.lastName(),
                request.subscriptionPlan() == null ? "FREE" : request.subscriptionPlan(),
                token
        );
    }

    public TokenResponse login(LoginRequest request) {
        return keycloakClient.token(request.email(), request.password());
    }

    public void passwordReset(PasswordResetRequest request) {
        keycloakClient.sendPasswordResetEmail(request.email());
    }

    /**
     * Ensures a Fitty profile exists for the authenticated Keycloak user. Used primarily after social
     * (Google/Facebook) login, where Keycloak brokers the account but no Fitty profile was created yet.
     * Reads identity from the access token; never trusts client-supplied identity.
     */
    public SyncProfileResponse syncProfile(String accessToken) {
        Map<?, ?> claims = keycloakClient.userInfo(accessToken);
        String userId = string(claims.get("sub"));
        String email = string(claims.get("email"));
        String firstName = string(claims.get("given_name"));
        String lastName = string(claims.get("family_name"));

        boolean created = false;
        if (!userProfileClient.exists(userId)) {
            userProfileClient.createProfile(userId, firstName, lastName, email, "FREE");
            created = true;
        }
        return new SyncProfileResponse(userId, email, firstName, lastName, created);
    }

    private String string(Object value) {
        return value == null ? "" : value.toString();
    }
}
