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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealService {
    private final MealRepository repository;
    private final MealMapper mapper;

    public UUID createMeal(@Valid MealRequestDTO request) {
        var response = repository.save(mapper.mapMealRequestToMeal(request));
        return response.getId();
    }

    public List<AteMealResponse> ateMeal(List<AteMealRequest> request) {
        return null;
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
