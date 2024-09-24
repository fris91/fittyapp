package com.fitty.meal_.service.api.dto;

import lombok.*;

import java.util.UUID;

@Setter
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CategoryRequestDTO {
    private UUID id;
    private String description;
    private String name;
}
