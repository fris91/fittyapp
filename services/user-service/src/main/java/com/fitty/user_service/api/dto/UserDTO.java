package com.fitty.user_service.api.dto;
import lombok.*;

import java.util.UUID;

 @AllArgsConstructor
 @NoArgsConstructor
 @Builder
 @Getter
 @Setter
public class UserDTO {
     private UUID id;
     private String firstName;
     private String lastName;
     private String email;
     private String role; // e.g., "STANDARD", "PRO"
     private PersonalDataDTO personalData;
     private DietaryPreferencesDTO dietaryPreferences;

}
