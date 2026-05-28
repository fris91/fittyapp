package com.fitty.health.service;

import com.fitty.health.domain.HealthSnapshot;
import com.fitty.health.dto.HealthDtos.HealthSnapshotRequest;
import com.fitty.health.dto.HealthDtos.HealthSnapshotResponse;
import com.fitty.health.dto.HealthDtos.ProviderPlaceholder;
import com.fitty.health.repository.HealthSnapshotRepository;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class HealthDataService {
    private static final String MEDICAL_DISCLAIMER = "Fitty does not provide medical diagnosis. Consult a specialist when risk indicators are present.";

    private final HealthSnapshotRepository repository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public HealthDataService(HealthSnapshotRepository repository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.repository = repository;
        this.kafkaTemplate = kafkaTemplate;
    }

    public HealthSnapshotResponse create(String userId, HealthSnapshotRequest request) {
        HealthSnapshot snapshot = new HealthSnapshot();
        snapshot.setUserId(userId);
        snapshot.setWeightKg(request.weightKg());
        snapshot.setHeightCm(request.heightCm());
        snapshot.setSystolicBloodPressure(request.systolicBloodPressure());
        snapshot.setDiastolicBloodPressure(request.diastolicBloodPressure());
        snapshot.setHeartRateBpm(request.heartRateBpm());
        snapshot.setSleepHours(request.sleepHours());
        snapshot.setSteps(request.steps());
        snapshot.setNotes(request.notes());
        snapshot.setRecordedAt(Instant.now());
        HealthSnapshot saved = repository.save(snapshot);

        kafkaTemplate.send("health-data-ingested", userId, event("health-data-ingested", userId, saved, "normal", null));
        detectRisk(saved).forEach(risk -> kafkaTemplate.send("health-risk-detected", userId, event("health-risk-detected", userId, saved, risk, MEDICAL_DISCLAIMER)));
        return toResponse(saved);
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
                snapshot.getWeightKg(),
                snapshot.getHeightCm(),
                snapshot.getSystolicBloodPressure(),
                snapshot.getDiastolicBloodPressure(),
                snapshot.getHeartRateBpm(),
                snapshot.getSleepHours(),
                snapshot.getSteps(),
                snapshot.getNotes(),
                snapshot.getRecordedAt(),
                bmi
        );
    }
}
