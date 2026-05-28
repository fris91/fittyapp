package com.fitty.meal_.service.impl.service;

import com.fitty.meal_.service.api.dto.AteMealRequest;
import com.fitty.meal_.service.api.dto.AteMealResponse;
import com.fitty.meal_.service.api.dto.MealRequestDTO;
import com.fitty.meal_.service.api.dto.MealResponseDTO;
import com.fitty.meal_.service.mapper.MealMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pl.coderion.model.ProductResponse;
import pl.coderion.service.OpenFoodFactsWrapper;
import pl.coderion.service.impl.OpenFoodFactsWrapperImpl;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealService {
    private final MealMapper mapper;
    @Autowired
    private final OpenFoodFactsWrapper wrapper;
    public UUID createMeal(@Valid MealRequestDTO request) {
return null;
    }

    public List<AteMealResponse> ateMeal(List<AteMealRequest> request) {
        return null;
    }
    public MealResponseDTO findById(UUID id) {
        return null;
    }

    public List<MealResponseDTO> findAll() {


        ProductResponse productResponse = wrapper.fetchProductByCode("737628064502");
        return null;
    }
}
