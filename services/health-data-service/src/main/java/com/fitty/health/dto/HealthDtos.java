package com.fitty.health.dto;

import com.fitty.health.domain.MeasurementType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.Instant;
import java.util.List;

public final class HealthDtos {
    private HealthDtos() {
    }

    /**
     * Unified body-data request. Both entry screens (physical measurements and body composition)
     * post here; they simply populate the fields relevant to their section plus a
     * {@code measurementType} so history can keep the two timelines separate. All measurements
     * are optional except that the service still requires weight to be present.
     */
    public record HealthSnapshotRequest(
            MeasurementType measurementType,
            String source,

            // Core / shared
            @DecimalMin("20.0") @DecimalMax("350.0") Double weightKg,
            @DecimalMin("80.0") @DecimalMax("250.0") Double heightCm,
            String notes,

            // Physical (anthropometric) measurements, centimetres
            @DecimalMin("10.0") @DecimalMax("80.0") Double neckCm,
            @DecimalMin("50.0") @DecimalMax("200.0") Double shouldersCm,
            @DecimalMin("40.0") @DecimalMax("200.0") Double chestCm,
            @DecimalMin("40.0") @DecimalMax("200.0") Double upperChestCm,
            @DecimalMin("30.0") @DecimalMax("250.0") Double waistCm,
            @DecimalMin("30.0") @DecimalMax("250.0") Double abdomenCm,
            @DecimalMin("40.0") @DecimalMax("250.0") Double hipsCm,
            @DecimalMin("40.0") @DecimalMax("250.0") Double glutesCm,
            @DecimalMin("15.0") @DecimalMax("90.0") Double rightArmCm,
            @DecimalMin("15.0") @DecimalMax("90.0") Double leftArmCm,
            @DecimalMin("10.0") @DecimalMax("70.0") Double rightForearmCm,
            @DecimalMin("10.0") @DecimalMax("70.0") Double leftForearmCm,
            @DecimalMin("25.0") @DecimalMax("120.0") Double rightThighCm,
            @DecimalMin("25.0") @DecimalMax("120.0") Double leftThighCm,
            @DecimalMin("15.0") @DecimalMax("90.0") Double rightCalfCm,
            @DecimalMin("15.0") @DecimalMax("90.0") Double leftCalfCm,
            @DecimalMin("8.0") @DecimalMax("40.0") Double wristCm,
            @DecimalMin("10.0") @DecimalMax("50.0") Double ankleCm,

            // Body composition (smart scale / bioimpedance)
            @DecimalMin("0.0") @DecimalMax("80.0") Double bodyFatPercentage,
            @DecimalMin("0.0") @DecimalMax("100.0") Double muscleMassPercentage,
            @DecimalMin("0.0") @DecimalMax("100.0") Double skeletalMusclePercentage,
            @DecimalMin("0.0") @DecimalMax("100.0") Double waterPercentage,
            @DecimalMin("0.0") @DecimalMax("60.0") Double visceralFat,
            @DecimalMin("0.0") @DecimalMax("10.0") Double boneMassKg,
            @DecimalMin("0.0") @DecimalMax("100.0") Double proteinPercentage,
            @Min(500) @Max(5000) Integer basalMetabolicRate,
            @Min(5) @Max(120) Integer metabolicAge,
            @DecimalMin("0.0") @DecimalMax("250.0") Double fatFreeMassKg,
            @DecimalMin("0.0") @DecimalMax("100.0") Double subcutaneousFatPercentage,

            // Wellness / vitals (legacy)
            @Min(60) @Max(260) Integer systolicBloodPressure,
            @Min(40) @Max(180) Integer diastolicBloodPressure,
            @Min(30) @Max(220) Integer heartRateBpm,
            @Min(1) @Max(5) Integer energyLevel,
            String mood,
            @DecimalMin("0.0") @DecimalMax("24.0") Double sleepHours,
            @Min(0) @Max(100000) Integer steps,

            Instant recordedAt
    ) {
    }

    public record HealthSnapshotResponse(
            String id,
            String userId,
            MeasurementType measurementType,
            String source,

            Double weightKg,
            Double heightCm,
            String notes,

            Double neckCm,
            Double shouldersCm,
            Double chestCm,
            Double upperChestCm,
            Double waistCm,
            Double abdomenCm,
            Double hipsCm,
            Double glutesCm,
            Double rightArmCm,
            Double leftArmCm,
            Double rightForearmCm,
            Double leftForearmCm,
            Double rightThighCm,
            Double leftThighCm,
            Double rightCalfCm,
            Double leftCalfCm,
            Double wristCm,
            Double ankleCm,

            Double bodyFatPercentage,
            Double muscleMassPercentage,
            Double skeletalMusclePercentage,
            Double waterPercentage,
            Double visceralFat,
            Double boneMassKg,
            Double proteinPercentage,
            Integer basalMetabolicRate,
            Integer metabolicAge,
            Double fatFreeMassKg,
            Double subcutaneousFatPercentage,

            Integer systolicBloodPressure,
            Integer diastolicBloodPressure,
            Integer heartRateBpm,
            Integer energyLevel,
            String mood,
            Double sleepHours,
            Integer steps,

            Instant recordedAt,
            Double bmi
    ) {
    }

    public record ProviderPlaceholder(String provider, String status, List<String> supportedSignals) {
    }
}
