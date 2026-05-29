package com.fitty.user_service.impl.entity;

import com.fitty.user_service.api.dto.DietaryPreferencesDTO;
import com.fitty.user_service.api.dto.PersonalDataDTO;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
@Document
public class UserEntity {
    @Id
    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String role; // e.g., "STANDARD", "PRO"
    private String subscriptionPlan;
    private PersonalDataEntity personalData;
    private DietaryPreferencesEntity dietaryPreferences;
}
