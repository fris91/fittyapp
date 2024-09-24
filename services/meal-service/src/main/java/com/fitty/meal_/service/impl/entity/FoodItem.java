package com.fitty.meal_.service.impl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
@Entity
public class FoodItem {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id")
    private UUID id;
    private String name;
    private String description;
    private Double quantity;
    private Double calories;
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "nutrients_id")
    private Nutrients nutrients;
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "category_id")
    private Category category;
    @ManyToOne
    @JoinColumn(name= "meal_id")
    private Meal meal;
}

