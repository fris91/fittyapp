package com.fitty.meal_.service.api.dto;

import com.fitty.meal_.service.impl.entity.FoodItem;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealResponseDTO {
    private UUID id;
    private String name;
    private String description;
    private List<FoodItemDTO> foodItems;
}
