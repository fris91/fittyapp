package com.fitty.user_service.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
public record UserResponse(
        String id,
        String firstName,
        String lastName,
        String email,
        String role, // e.g., "STANDARD", "PRO"
        String subscriptionPlan,
        PersonalDataDTO personalData,
        DietaryPreferencesDTO dietaryPreferencesDTO
) {
}
