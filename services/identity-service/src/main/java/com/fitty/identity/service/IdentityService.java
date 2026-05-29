package com.fitty.identity.service;

import com.fitty.identity.dto.IdentityDtos.IdentityResponse;
import com.fitty.identity.dto.IdentityDtos.LoginRequest;
import com.fitty.identity.dto.IdentityDtos.RegisterRequest;
import com.fitty.identity.dto.IdentityDtos.TokenResponse;
import org.springframework.stereotype.Service;

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
}
