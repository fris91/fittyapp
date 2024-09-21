package com.fitty.meal_.service.impl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class Meal {
    @Id
    private String id;
    private String name;
    private String description;
    @OneToMany(mappedBy = "fitty-meals",cascade = CascadeType.REMOVE)
    private List<FoodItem> foodItems;
}
