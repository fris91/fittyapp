package com.fitty.user_service.api.dto;

import java.util.List;

/**
 * Aggregated payload for the mobile Progress screen.
 * Slice 4 will fill weightTrend and wellnessScore from real history.
 */
public record MobileProgressResponse(
        Integer wellnessScore,
        Double weightKg,
        Double bmi,
        Double bodyFatPercentage,
        Double muscleMassPercentage,
        List<Double> weightTrend
) {
}
