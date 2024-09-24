package com.fitty.meal_.service.impl.controller;

import com.fitty.meal_.service.api.dto.AteMealRequest;
import com.fitty.meal_.service.api.dto.AteMealResponse;
import com.fitty.meal_.service.api.dto.MealRequestDTO;
import com.fitty.meal_.service.api.dto.MealResponseDTO;
import com.fitty.meal_.service.impl.service.MealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/meal-service")
@RequiredArgsConstructor
public class MealController {
    private final MealService service;

    @PostMapping
    public ResponseEntity<UUID> createMeal(@RequestBody @Valid MealRequestDTO request){
        return ResponseEntity.ok(service.createMeal(request));
    }

    @PostMapping("/ate-meal")
    public ResponseEntity<List<AteMealResponse>> ateMeal(@RequestBody List<AteMealRequest> request){
        return ResponseEntity.ok(service.ateMeal(request));
    }
    @GetMapping("/{meal-id}")
    public ResponseEntity<MealResponseDTO> getMeal(@PathVariable("meal-id")UUID mealId){
        MealResponseDTO byId = service.findById(mealId);
        return ResponseEntity.ok(byId);
    }
    @GetMapping()
    public ResponseEntity<List<MealResponseDTO>> getMealList(){
        return ResponseEntity.ok(service.findAll());
    }
}
