package com.fitty.meal_.service.impl.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/meal")
@RequiredArgsConstructor
public class MealController {
    private final MealService service;

    @PostMapping
    public ResponseEntity<Integer> createMeal(@RequestBody @Valid MealRequest request){
        return ResponseEntity.ok(service.createMeal(request));
    }

    @PostMapping("/ate-meal")
    public ResponseEntity<List<AteMealResponse>> ateMeal(@RequestBody List<AteMealRequest> request){
        return ResponseEntity.ok(service.ateMeal(request));
    }
    @GetMapping("/{meal-id}")
    public ResponseEntity<MealResponse> getMeal(@PathVariable("meal-id")Integer mealId){
        return ResponseEntity.ok(service.findById());
    }
    @GetMapping("/{meal-id}")
    public ResponseEntity<List<MealResponse>> getMealList(){
        return ResponseEntity.ok(service.findAll());
    }
}
