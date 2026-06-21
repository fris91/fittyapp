package com.fitty.health.repository;

import com.fitty.health.domain.HealthSnapshot;
import com.fitty.health.domain.MeasurementType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface HealthSnapshotRepository extends MongoRepository<HealthSnapshot, String> {
    Optional<HealthSnapshot> findFirstByUserIdOrderByRecordedAtDesc(String userId);

    List<HealthSnapshot> findTop100ByUserIdOrderByRecordedAtDesc(String userId);

    List<HealthSnapshot> findTop100ByUserIdAndMeasurementTypeOrderByRecordedAtDesc(String userId, MeasurementType measurementType);
}
