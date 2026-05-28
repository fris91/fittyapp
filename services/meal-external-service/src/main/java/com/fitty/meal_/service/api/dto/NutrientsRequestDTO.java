package com.fitty.meal_.service.api.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class NutrientsRequestDTO {
    private UUID id;
    private Double proteins;
    private Double carbohydrates;
    private Double fats;
}
