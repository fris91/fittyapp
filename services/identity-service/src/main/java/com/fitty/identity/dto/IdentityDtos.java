package com.fitty.identity.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public final class IdentityDtos {
    private IdentityDtos() {
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @Size(min = 8)
            @Pattern(
                    regexp = "^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$",
                    message = "La password deve contenere almeno 8 caratteri, una maiuscola e un carattere speciale"
            )
            String password,
            @NotBlank String firstName,
            @NotBlank String lastName,
            String locale,
            String subscriptionPlan,
            List<String> goals,
            @Valid BodyBasics bodyBasics,
            @Valid ActivityProfile activityProfile,
            @Valid Consent consent,
            @Valid SocialIdentity socialIdentity
    ) {
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    public record PasswordResetRequest(@Email @NotBlank String email) {
    }

    public record BodyBasics(String sex, Integer age, Integer heightCm, Integer weightKg) {
    }

    public record ActivityProfile(String activityLevel, String connectedProvider) {
    }

    public record Consent(
            @NotNull Boolean wellnessDataProcessing,
            @NotNull Boolean medicalBoundaryAccepted,
            Boolean marketing
    ) {
    }

    public record SocialIdentity(String provider, String providerSubject, String providerEmail, Map<String, String> claims) {
    }

    public record IdentityResponse(
            String keycloakUserId,
            String appUserId,
            String email,
            String firstName,
            String lastName,
            String subscriptionPlan,
            TokenResponse token
    ) {
    }

    public record TokenResponse(
            String accessToken,
            String refreshToken,
            String idToken,
            Integer expiresIn,
            String tokenType
    ) {
    }
}
