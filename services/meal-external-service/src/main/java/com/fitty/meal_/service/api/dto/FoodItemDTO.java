package com.fitty.meal_.service.api.dto;

import com.fitty.meal_.service.impl.entity.Nutrients;
import lombok.*;

import java.util.UUID;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodItemDTO {
    private UUID id;
    private String name;
    private String description;
    private Double quantity;
    private Double calories;
    private Nutrients nutrients;
    private CategoryDTO category;
}
