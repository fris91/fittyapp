package com.fitty.health.service;

import com.fitty.health.domain.HealthSnapshot;
import com.fitty.health.domain.MeasurementType;
import com.fitty.health.dto.HealthDtos.HealthSnapshotRequest;
import com.fitty.health.dto.HealthDtos.HealthSnapshotResponse;
import com.fitty.health.dto.HealthDtos.ProviderPlaceholder;
import com.fitty.health.repository.HealthSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class HealthDataService {
    private static final String MEDICAL_DISCLAIMER = "Fitty does not provide medical diagnosis. Consult a specialist when risk indicators are present.";
    private static final Logger log = LoggerFactory.getLogger(HealthDataService.class);

    private final HealthSnapshotRepository repository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public HealthDataService(HealthSnapshotRepository repository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.repository = repository;
        this.kafkaTemplate = kafkaTemplate;
    }

    public HealthSnapshotResponse create(String userId, HealthSnapshotRequest request) {
        HealthSnapshot snapshot = new HealthSnapshot();
        snapshot.setUserId(userId);
        snapshot.setMeasurementType(resolveMeasurementType(request));
        snapshot.setSource(request.source() == null || request.source().isBlank() ? "manual" : request.source());

        snapshot.setWeightKg(request.weightKg());
        snapshot.setHeightCm(request.heightCm());
        snapshot.setNotes(request.notes());

        snapshot.setNeckCm(request.neckCm());
        snapshot.setShouldersCm(request.shouldersCm());
        snapshot.setChestCm(request.chestCm());
        snapshot.setUpperChestCm(request.upperChestCm());
        snapshot.setWaistCm(request.waistCm());
        snapshot.setAbdomenCm(request.abdomenCm());
        snapshot.setHipsCm(request.hipsCm());
        snapshot.setGlutesCm(request.glutesCm());
        snapshot.setRightArmCm(request.rightArmCm());
        snapshot.setLeftArmCm(request.leftArmCm());
        snapshot.setRightForearmCm(request.rightForearmCm());
        snapshot.setLeftForearmCm(request.leftForearmCm());
        snapshot.setRightThighCm(request.rightThighCm());
        snapshot.setLeftThighCm(request.leftThighCm());
        snapshot.setRightCalfCm(request.rightCalfCm());
        snapshot.setLeftCalfCm(request.leftCalfCm());
        snapshot.setWristCm(request.wristCm());
        snapshot.setAnkleCm(request.ankleCm());

        snapshot.setBodyFatPercentage(request.bodyFatPercentage());
        snapshot.setMuscleMassPercentage(request.muscleMassPercentage());
        snapshot.setSkeletalMusclePercentage(request.skeletalMusclePercentage());
        snapshot.setWaterPercentage(request.waterPercentage());
        snapshot.setVisceralFat(request.visceralFat());
        snapshot.setBoneMassKg(request.boneMassKg());
        snapshot.setProteinPercentage(request.proteinPercentage());
        snapshot.setBasalMetabolicRate(request.basalMetabolicRate());
        snapshot.setMetabolicAge(request.metabolicAge());
        snapshot.setFatFreeMassKg(request.fatFreeMassKg());
        snapshot.setSubcutaneousFatPercentage(request.subcutaneousFatPercentage());

        snapshot.setSystolicBloodPressure(request.systolicBloodPressure());
        snapshot.setDiastolicBloodPressure(request.diastolicBloodPressure());
        snapshot.setHeartRateBpm(request.heartRateBpm());
        snapshot.setEnergyLevel(request.energyLevel());
        snapshot.setMood(request.mood());
        snapshot.setSleepHours(request.sleepHours());
        snapshot.setSteps(request.steps());

        snapshot.setRecordedAt(request.recordedAt() != null ? request.recordedAt() : Instant.now());
        HealthSnapshot saved = repository.save(snapshot);

        publishEvents(userId, saved);
        return toResponse(saved);
    }

    /**
     * Trust an explicit type from the client; otherwise infer it from the populated fields so
     * legacy callers (and the two new screens, should they omit it) still land in the right
     * timeline.
     */
    private MeasurementType resolveMeasurementType(HealthSnapshotRequest request) {
        if (request.measurementType() != null) {
            return request.measurementType();
        }
        if (hasAnyComposition(request)) {
            return MeasurementType.BODY_COMPOSITION;
        }
        if (hasAnyCircumference(request)) {
            return MeasurementType.PHYSICAL_MEASUREMENT;
        }
        return MeasurementType.WELLNESS;
    }

    private boolean hasAnyComposition(HealthSnapshotRequest r) {
        return r.bodyFatPercentage() != null || r.muscleMassPercentage() != null || r.skeletalMusclePercentage() != null
                || r.waterPercentage() != null || r.visceralFat() != null || r.boneMassKg() != null
                || r.proteinPercentage() != null || r.basalMetabolicRate() != null || r.metabolicAge() != null
                || r.fatFreeMassKg() != null || r.subcutaneousFatPercentage() != null;
    }

    private boolean hasAnyCircumference(HealthSnapshotRequest r) {
        return r.neckCm() != null || r.shouldersCm() != null || r.chestCm() != null || r.upperChestCm() != null
                || r.waistCm() != null || r.abdomenCm() != null || r.hipsCm() != null || r.glutesCm() != null
                || r.rightArmCm() != null || r.leftArmCm() != null || r.rightForearmCm() != null || r.leftForearmCm() != null
                || r.rightThighCm() != null || r.leftThighCm() != null || r.rightCalfCm() != null || r.leftCalfCm() != null
                || r.wristCm() != null || r.ankleCm() != null;
    }

    private void publishEvents(String userId, HealthSnapshot saved) {
        try {
            kafkaTemplate.send("health-data-ingested", userId, event("health-data-ingested", userId, saved, "normal", null));
            detectRisk(saved).forEach(risk -> kafkaTemplate.send("health-risk-detected", userId, event("health-risk-detected", userId, saved, risk, MEDICAL_DISCLAIMER)));
        } catch (RuntimeException error) {
            log.warn("Health snapshot {} was saved, but Kafka publishing failed: {}", saved.getId(), error.getMessage());
        }
    }

    public HealthSnapshotResponse latest(String userId) {
        return repository.findFirstByUserIdOrderByRecordedAtDesc(userId)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("No health data found"));
    }

    public List<HealthSnapshotResponse> history(String userId) {
        return repository.findTop100ByUserIdOrderByRecordedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<HealthSnapshotResponse> history(String userId, MeasurementType type) {
        if (type == null) {
            return history(userId);
        }
        return repository.findTop100ByUserIdAndMeasurementTypeOrderByRecordedAtDesc(userId, type).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ProviderPlaceholder> providers() {
        return List.of(
                new ProviderPlaceholder("google-fit", "placeholder", List.of("steps", "heart-rate", "sleep")),
                new ProviderPlaceholder("health-connect", "placeholder", List.of("weight", "sleep", "activity")),
                new ProviderPlaceholder("xiaomi-health", "placeholder", List.of("steps", "heart-rate"))
        );
    }

    private List<String> detectRisk(HealthSnapshot snapshot) {
        boolean highHeartRate = snapshot.getHeartRateBpm() != null && snapshot.getHeartRateBpm() > 110;
        boolean highBloodPressure = snapshot.getSystolicBloodPressure() != null && snapshot.getSystolicBloodPressure() >= 140;
        if (highHeartRate || highBloodPressure) {
            return List.of("medium");
        }
        return List.of();
    }

    private Map<String, Object> event(String type, String userId, HealthSnapshot snapshot, String status, String message) {
        return Map.of(
                "eventId", UUID.randomUUID().toString(),
                "type", type,
                "occurredAt", Instant.now().toString(),
                "userId", userId,
                "snapshotId", snapshot.getId(),
                "status", status,
                "message", message == null ? "" : message
        );
    }

    private HealthSnapshotResponse toResponse(HealthSnapshot snapshot) {
        Double bmi = null;
        if (snapshot.getWeightKg() != null && snapshot.getHeightCm() != null && snapshot.getHeightCm() > 0) {
            double meters = snapshot.getHeightCm() / 100.0;
            bmi = Math.round((snapshot.getWeightKg() / (meters * meters)) * 10.0) / 10.0;
        }
        return new HealthSnapshotResponse(
                snapshot.getId(),
                snapshot.getUserId(),
                snapshot.getMeasurementType(),
                snapshot.getSource(),

                snapshot.getWeightKg(),
                snapshot.getHeightCm(),
                snapshot.getNotes(),

                snapshot.getNeckCm(),
                snapshot.getShouldersCm(),
                snapshot.getChestCm(),
                snapshot.getUpperChestCm(),
                snapshot.getWaistCm(),
                snapshot.getAbdomenCm(),
                snapshot.getHipsCm(),
                snapshot.getGlutesCm(),
                snapshot.getRightArmCm(),
                snapshot.getLeftArmCm(),
                snapshot.getRightForearmCm(),
                snapshot.getLeftForearmCm(),
                snapshot.getRightThighCm(),
                snapshot.getLeftThighCm(),
                snapshot.getRightCalfCm(),
                snapshot.getLeftCalfCm(),
                snapshot.getWristCm(),
                snapshot.getAnkleCm(),

                snapshot.getBodyFatPercentage(),
                snapshot.getMuscleMassPercentage(),
                snapshot.getSkeletalMusclePercentage(),
                snapshot.getWaterPercentage(),
                snapshot.getVisceralFat(),
                snapshot.getBoneMassKg(),
                snapshot.getProteinPercentage(),
                snapshot.getBasalMetabolicRate(),
                snapshot.getMetabolicAge(),
                snapshot.getFatFreeMassKg(),
                snapshot.getSubcutaneousFatPercentage(),

                snapshot.getSystolicBloodPressure(),
                snapshot.getDiastolicBloodPressure(),
                snapshot.getHeartRateBpm(),
                snapshot.getEnergyLevel(),
                snapshot.getMood(),
                snapshot.getSleepHours(),
                snapshot.getSteps(),

                snapshot.getRecordedAt(),
                bmi
        );
    }
}
