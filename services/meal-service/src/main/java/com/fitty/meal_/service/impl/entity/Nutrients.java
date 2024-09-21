package com.fitty.meal_.service.impl.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.*;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
@Entity
public class Nutrients {
    @GeneratedValue
    @Id
    private int id;
    private Double proteins;
    private Double carbohydrates;
    private Double fats;
}
