package com.fitty.health.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.Instant;
import java.util.List;

public final class HealthDtos {
    private HealthDtos() {
    }

    public record HealthSnapshotRequest(
            @DecimalMin("20.0") @DecimalMax("350.0") Double weightKg,
            @DecimalMin("80.0") @DecimalMax("250.0") Double heightCm,
            @Min(60) @Max(260) Integer systolicBloodPressure,
            @Min(40) @Max(180) Integer diastolicBloodPressure,
            @Min(30) @Max(220) Integer heartRateBpm,
            @DecimalMin("0.0") @DecimalMax("24.0") Double sleepHours,
            @Min(0) @Max(100000) Integer steps,
            String notes
    ) {
    }

    public record HealthSnapshotResponse(
            String id,
            String userId,
            Double weightKg,
            Double heightCm,
            Integer systolicBloodPressure,
            Integer diastolicBloodPressure,
            Integer heartRateBpm,
            Double sleepHours,
            Integer steps,
            String notes,
            Instant recordedAt,
            Double bmi
    ) {
    }

    public record ProviderPlaceholder(String provider, String status, List<String> supportedSignals) {
    }
}
