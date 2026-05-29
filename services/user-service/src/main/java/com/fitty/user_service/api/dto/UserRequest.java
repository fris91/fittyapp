package com.fitty.user_service.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record UserRequest(
        String id,
        @NotNull(message = "User firstname is required")
        String firstName,
        @NotNull(message = "User lastname is required")
        String lastName,
        @Email(message = "User email is not a valid email address")
        String email,
        String role, // e.g., "STANDARD", "PRO"
        String subscriptionPlan,
        PersonalDataDTO personalData,
        DietaryPreferencesDTO dietaryPreferencesDTO
) {
}
