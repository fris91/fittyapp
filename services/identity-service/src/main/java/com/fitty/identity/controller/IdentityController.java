package com.fitty.identity.controller;

import com.fitty.identity.dto.IdentityDtos.IdentityResponse;
import com.fitty.identity.dto.IdentityDtos.LoginRequest;
import com.fitty.identity.dto.IdentityDtos.PasswordResetRequest;
import com.fitty.identity.dto.IdentityDtos.RegisterRequest;
import com.fitty.identity.dto.IdentityDtos.SyncProfileResponse;
import com.fitty.identity.dto.IdentityDtos.TokenResponse;
import com.fitty.identity.service.IdentityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/identity")
public class IdentityController {
    private final IdentityService service;

    public IdentityController(IdentityService service) {
        this.service = service;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public IdentityResponse register(@Valid @RequestBody RegisterRequest request) {
        return service.register(request);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request);
    }

    @PostMapping("/password-reset")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void passwordReset(@Valid @RequestBody PasswordResetRequest request) {
        service.passwordReset(request);
    }

    /**
     * Creates the Fitty profile for the currently authenticated Keycloak user if it is missing.
     * Called by the web/mobile app after social (Google/Facebook) login completes.
     */
    @PostMapping("/sync-profile")
    public SyncProfileResponse syncProfile(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        if (authorization == null || !authorization.toLowerCase().startsWith("bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }
        return service.syncProfile(authorization.substring(7).trim());
    }
}
