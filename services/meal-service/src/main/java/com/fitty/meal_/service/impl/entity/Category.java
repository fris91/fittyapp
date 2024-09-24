package com.fitty.meal_.service.impl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
@Entity
public class Category {
    @Id
    @GeneratedValue
    @Column(name = "id")
    private UUID id;
    private String name;
    private String description;

}
