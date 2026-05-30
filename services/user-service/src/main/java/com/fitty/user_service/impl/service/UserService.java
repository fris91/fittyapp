package com.fitty.user_service.impl.service;

import com.fitty.user_service.api.dto.UserRequest;
import com.fitty.user_service.api.dto.UserResponse;
import com.fitty.user_service.impl.entity.UserEntity;
import com.fitty.user_service.impl.exception.UserNotFoundException;
import com.fitty.user_service.impl.repository.UserRepository;
import com.fitty.user_service.mapper.UserMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private final UserRepository repository;
    private final UserMapper mapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public String createUser(UserRequest request) {
        var user = repository.save(mapper.mapUserDTOtoUserEntity(request));
        publish("user-profile-updated", user);
        return user.getId();
    }

    public String UpdateUser(UserRequest request) {
        var user = repository.findById(request.id())
                .orElseThrow(()-> new UserNotFoundException(String.format("User with id '%s' not found", request.id())));
        mergeUser(user,request);
        repository.save(user);
        publish("user-profile-updated", user);

        return "updated";
    }

    private void mergeUser(UserEntity user, UserRequest request) {
        if(StringUtils.isNotBlank(request.firstName())){
            user.setFirstName(request.firstName());
        }
        if(StringUtils.isNotBlank(request.lastName())){
            user.setLastName(request.lastName());
        }
        if(StringUtils.isNotBlank(request.email())){
            user.setEmail(request.email());
        }
        if(StringUtils.isNotBlank(request.role())){
            user.setRole(request.role());
        }
        if(StringUtils.isNotBlank(request.subscriptionPlan())){
            user.setSubscriptionPlan(request.subscriptionPlan());
        }
        if (request.dietaryPreferencesDTO() != null) {

        }
    }

    public List<UserResponse> findAllUsers() {
        return repository
                .findAll()
                .stream()
                .map(mapper::UserEntityToUserResponse)
                .collect(Collectors.toList());
    }

    public UserResponse findUserById(String userId) {
        return repository.findById(userId).map(mapper::UserEntityToUserResponse).orElseThrow(()-> new UserNotFoundException(String.format("User with id '%s' not found", userId)));
    }

    public Boolean existsUserById(String userId) {
        return repository.findById(userId).isPresent();
    }

    public void deleteUserById(String userId) {
        repository.deleteById(userId);
    }

    public List<UserResponse> findAllAdminVisibleUsers() {
        return findAllUsers();
    }

    public UserResponse findAdminVisibleUserById(String userId) {
        return findUserById(userId);
    }

    public UserResponse updateAdminVisibleUser(String userId, UserRequest request) {
        var user = repository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(String.format("User with id '%s' not found", userId)));
        mergeUser(user, request);
        repository.save(user);
        publish("user-profile-updated", user);
        return mapper.UserEntityToUserResponse(user);
    }

    private void publish(String topic, UserEntity user) {
        try {
            kafkaTemplate.send(topic, user.getId(), Map.of(
                    "eventId", UUID.randomUUID().toString(),
                    "type", topic,
                    "occurredAt", Instant.now().toString(),
                    "userId", user.getId(),
                    "email", user.getEmail() == null ? "" : user.getEmail()
            )).whenComplete((result, error) -> {
                if (error != null) {
                    log.warn("Could not publish {} event for user {}. Profile persistence already succeeded.", topic, user.getId(), error);
                }
            });
        } catch (RuntimeException error) {
            log.warn("Could not enqueue {} event for user {}. Profile persistence already succeeded.", topic, user.getId(), error);
        }
    }
}
