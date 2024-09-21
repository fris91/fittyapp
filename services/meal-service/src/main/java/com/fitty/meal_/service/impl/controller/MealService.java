package com.fitty.meal_.service.impl.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MealService {
    public Integer createMeal(@Valid MealRequest request) {
        return null;
    }

    public List<AteMealResponse> ateMeal(List<AteMealRequest> request) {
        return null;
    }

    public MealResponse findById() {
        return null;
    }

    public List<MealResponse> findAll() {
        return null;
    }
}
