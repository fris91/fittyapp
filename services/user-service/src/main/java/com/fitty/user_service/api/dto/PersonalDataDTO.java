package com.fitty.user_service.api.dto;

import lombok.*;

import java.time.LocalDate;
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class PersonalDataDTO {
   // @Positive(message = "Height must be a positive value")
    private Double height; // in cm

  //  @Positive(message = "Weight must be a positive value")
    private Double weight; // in kg

 //   @Past(message = "Date of birth must be in the past")
    private String dateOfBirth;

    private String gender; // "MALE" or "FEMALE"

    // Getters e Setters
}