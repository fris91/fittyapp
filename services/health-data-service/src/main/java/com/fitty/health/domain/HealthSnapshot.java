package com.fitty.health.domain;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * A single body-data snapshot for a user.
 *
 * <p>One flat document intentionally holds every measurement kind. {@link #measurementType}
 * records which entry screen produced it so history/trends can be filtered, while the BFF and
 * legacy clients keep reading the flat top-level fields they always relied on
 * (weight, body fat, muscle, steps).
 */
@Getter
@Setter
@Document("health_snapshots")
public class HealthSnapshot {
    @Id
    private String id;
    @Indexed
    private String userId;

    /** PHYSICAL_MEASUREMENT | BODY_COMPOSITION | WELLNESS. */
    private MeasurementType measurementType;
    /** manual | smart_scale | import | ai_assistant. */
    private String source;

    // --- Core / shared ---------------------------------------------------------------------
    private Double weightKg;
    private Double heightCm;
    private String notes;

    // --- Physical (anthropometric) measurements, centimetres -------------------------------
    private Double neckCm;
    private Double shouldersCm;
    private Double chestCm;
    private Double upperChestCm;
    private Double waistCm;
    private Double abdomenCm;
    private Double hipsCm;
    private Double glutesCm;
    private Double rightArmCm;
    private Double leftArmCm;
    private Double rightForearmCm;
    private Double leftForearmCm;
    private Double rightThighCm;
    private Double leftThighCm;
    private Double rightCalfCm;
    private Double leftCalfCm;
    private Double wristCm;
    private Double ankleCm;

    // --- Body composition (smart scale / bioimpedance) -------------------------------------
    private Double bodyFatPercentage;
    private Double muscleMassPercentage;
    private Double skeletalMusclePercentage;
    private Double waterPercentage;
    private Double visceralFat;
    private Double boneMassKg;
    private Double proteinPercentage;
    private Integer basalMetabolicRate;
    private Integer metabolicAge;
    private Double fatFreeMassKg;
    private Double subcutaneousFatPercentage;

    // --- Wellness / vitals (legacy) --------------------------------------------------------
    private Integer systolicBloodPressure;
    private Integer diastolicBloodPressure;
    private Integer heartRateBpm;
    private Integer energyLevel;
    private String mood;
    private Double sleepHours;
    private Integer steps;

    private Instant recordedAt;
}
