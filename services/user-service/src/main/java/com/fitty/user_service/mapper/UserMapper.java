package com.fitty.user_service.mapper;

import com.fitty.user_service.api.dto.DietaryPreferencesDTO;
import com.fitty.user_service.api.dto.PersonalDataDTO;
import com.fitty.user_service.api.dto.UserRequest;
import com.fitty.user_service.api.dto.UserResponse;
import com.fitty.user_service.impl.entity.DietaryPreferencesEntity;
import com.fitty.user_service.impl.entity.PersonalDataEntity;
import com.fitty.user_service.impl.entity.UserEntity;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class UserMapper {

    public UserEntity mapUserDTOtoUserEntity( UserRequest request) {
        return UserEntity
                .builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .role(request.role())
                .subscriptionPlan(request.subscriptionPlan() == null ? "FREE" : request.subscriptionPlan())
                .personalData(request.personalData() == null ? null : mapPersonalDataDTOtoPersonalDataEntity(request.personalData()))
                .dietaryPreferences(request.dietaryPreferencesDTO() == null ? null : mapPersonalDataDTOtoPersonalDataEntity(request.dietaryPreferencesDTO()))
                .build();
    }
    private PersonalDataEntity mapPersonalDataDTOtoPersonalDataEntity(PersonalDataDTO personalDataDTO ) {
        return PersonalDataEntity
                .builder()
                .dateOfBirth(LocalDate.parse(personalDataDTO.getDateOfBirth(),DateTimeFormatter.ofPattern("dd-MM-yyyy")))
                .gender(personalDataDTO.getGender())
                .height(personalDataDTO.getHeight())
                .weight(personalDataDTO.getWeight())
                .build();
    }
    private DietaryPreferencesEntity mapPersonalDataDTOtoPersonalDataEntity(DietaryPreferencesDTO dietaryPreferencesDTO ) {
        return DietaryPreferencesEntity
                .builder()
                .dietType(dietaryPreferencesDTO.getDietType())
                .goals(dietaryPreferencesDTO.getGoals())
                .restrictions(dietaryPreferencesDTO.getRestrictions())
                .build();
    }

    public UserResponse UserEntityToUserResponse(UserEntity userEntity) {
        return UserResponse
                .builder()
                .id(userEntity.getId())
                .firstName(userEntity.getFirstName())
                .lastName(userEntity.getLastName())
                .email(userEntity.getEmail())
                .role(userEntity.getRole())
                .subscriptionPlan(userEntity.getSubscriptionPlan() == null ? "FREE" : userEntity.getSubscriptionPlan())
                .dietaryPreferencesDTO(null)
                .personalData(null)
                .build();
    }
}
