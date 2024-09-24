package com.fitty.meal_.service.impl.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import lombok.*;

import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
@Entity
public class Nutrients {
    @GeneratedValue
    @Id
    @Column(name = "id")
    private UUID id;
    private Double proteins;
    private Double carbohydrates;
    private Double fats;
}
