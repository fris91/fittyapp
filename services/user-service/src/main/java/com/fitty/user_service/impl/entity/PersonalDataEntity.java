package com.fitty.user_service.impl.entity;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class PersonalDataEntity {
    private Double height; // in cm

    @Positive(message = "Weight must be a positive value")
    private Double weight; // in kg

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private String gender; // "MALE" or "FEMALE"
}
