package com.fitty.user_service.api.dto;

import lombok.*;

import java.util.List;
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class DietaryPreferencesDTO {
    private List<String> restrictions; // e.g., ["Gluten", "Lactose"]
    private String goals; // e.g., "Lose weight", "Gain muscle mass"
    private String dietType; // e.g., "VEGETARIAN", "VEGAN", "OMNIVORE"
}
