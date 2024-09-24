package com.fitty.meal_.service.impl.repository;

import com.fitty.meal_.service.impl.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface MealRepository extends JpaRepository<Meal, UUID> {

    @Query("SELECT m FROM Meal m LEFT JOIN FETCH m.foodItems WHERE m.id = :id")
    Optional<Meal> findById(@Param("id") UUID id);
}
