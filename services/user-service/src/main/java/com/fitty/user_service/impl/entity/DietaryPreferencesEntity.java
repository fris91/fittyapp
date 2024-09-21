package com.fitty.user_service.impl.entity;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class DietaryPreferencesEntity {
    private List<String> restrictions; // e.g., ["Gluten", "Lactose"]
    private String goals; // e.g., "Lose weight", "Gain muscle mass"
    private String dietType; // e.g., "VEGETARIAN", "VEGAN", "OMNIVORE"
}
