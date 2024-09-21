package com.fitty.meal_.service.impl.entity;

import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import lombok.*;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class FoodItem {
    @Id
    private String id;
    private String name;
    private String description;
    private Double quantity;
    private Double calories;
    @ManyToOne
    @JoinColumn(name = "nutrients_id")
    private Nutrients nutrients;
    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;
    @ManyToOne
    @JoinColumn(name= "meal_id")
    private Meal meal;
}
