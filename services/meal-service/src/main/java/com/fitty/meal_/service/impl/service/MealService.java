package com.fitty.meal_.service.impl.service;

import com.fitty.meal_.service.api.dto.AteMealRequest;
import com.fitty.meal_.service.api.dto.AteMealResponse;
import com.fitty.meal_.service.api.dto.MealRequestDTO;
import com.fitty.meal_.service.api.dto.MealResponseDTO;
import com.fitty.meal_.service.impl.repository.MealRepository;
import com.fitty.meal_.service.mapper.MealMapper;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealService {
    private final MealRepository repository;
    private final MealMapper mapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public UUID createMeal(@Valid MealRequestDTO request) {
        var response = repository.save(mapper.mapMealRequestToMeal(request));
        kafkaTemplate.send("nutrition-plan-updated", response.getId().toString(), Map.of(
                "eventId", UUID.randomUUID().toString(),
                "type", "nutrition-plan-updated",
                "occurredAt", Instant.now().toString(),
                "planId", response.getId().toString()
        ));
        return response.getId();
    }

    public List<AteMealResponse> ateMeal(List<AteMealRequest> request) {
        return Collections.emptyList();
    }
    @Transactional(readOnly = true)
    public MealResponseDTO findById(UUID id) {
        return repository.findById(id).map(mapper::mapMealToMealResponseDTO).orElseThrow(()->new EntityNotFoundException("Meal not found"));
    }

    public List<MealResponseDTO> findAll() {
        return repository.findAll().stream()
                .map(mapper::mapMealToMealResponseDTO)
                .collect(Collectors.toList());
    }
}
