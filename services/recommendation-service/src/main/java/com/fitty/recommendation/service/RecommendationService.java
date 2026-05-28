package com.fitty.recommendation.service;

import com.fitty.recommendation.domain.Recommendation;
import com.fitty.recommendation.repository.RecommendationRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class RecommendationService {
    private final RecommendationRepository repository;
    private final RecommendationEngine engine;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public RecommendationService(RecommendationRepository repository, RecommendationEngine engine, KafkaTemplate<String, Object> kafkaTemplate) {
        this.repository = repository;
        this.engine = engine;
        this.kafkaTemplate = kafkaTemplate;
    }

    @KafkaListener(topics = {"health-data-ingested", "health-risk-detected"})
    public void onHealthEvent(Map<String, Object> event) {
        Recommendation saved = repository.save(engine.fromHealthEvent(event));
        kafkaTemplate.send("recommendation-ready", saved.getUserId(), Map.of(
                "eventId", UUID.randomUUID().toString(),
                "type", "recommendation-ready",
                "occurredAt", Instant.now().toString(),
                "userId", saved.getUserId(),
                "recommendationId", saved.getId(),
                "priority", saved.getPriority(),
                "category", saved.getCategory()
        ));
    }

    public Recommendation latest(String userId) {
        return repository.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .orElseGet(() -> {
                    Recommendation seed = new Recommendation();
                    seed.setUserId(userId);
                    seed.setCategory("general");
                    seed.setPriority("normal");
                    seed.setTitle("Add your first health snapshot");
                    seed.setMessage("Enter weight, sleep, steps, or heart rate to unlock tailored Fitty recommendations.");
                    seed.setDisclaimer("Fitty does not provide medical diagnosis.");
                    seed.setCreatedAt(Instant.now());
                    return repository.save(seed);
                });
    }

    public List<Recommendation> list(String userId) {
        return repository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
    }
}
