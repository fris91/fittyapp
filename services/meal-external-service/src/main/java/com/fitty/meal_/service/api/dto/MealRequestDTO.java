package com.fitty.meal_.service.api.dto;

import com.fitty.meal_.service.impl.entity.FoodItem;
import jakarta.persistence.CascadeType;
import jakarta.persistence.OneToMany;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MealRequestDTO {
    private UUID id;
    private String name;
    private String description;
    private List<FoodItemDTO> foodItems;
}
