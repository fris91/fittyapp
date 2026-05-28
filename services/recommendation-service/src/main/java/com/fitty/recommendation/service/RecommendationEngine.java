package com.fitty.recommendation.service;

import com.fitty.recommendation.domain.Recommendation;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

@Component
public class RecommendationEngine {
    private static final String DISCLAIMER = "Fitty does not provide medical diagnosis. This recommendation is informational; consult a specialist when risk indicators are present.";

    public Recommendation fromHealthEvent(Map<String, Object> event) {
        Recommendation recommendation = new Recommendation();
        recommendation.setUserId(String.valueOf(event.getOrDefault("userId", "local-user")));
        recommendation.setCreatedAt(Instant.now());
        recommendation.setDisclaimer(DISCLAIMER);
        String status = String.valueOf(event.getOrDefault("status", "normal"));
        if ("medium".equalsIgnoreCase(status)) {
            recommendation.setCategory("risk");
            recommendation.setPriority("high");
            recommendation.setTitle("Review today's health signals");
            recommendation.setMessage("Some values crossed starter thresholds. Recheck the measurement and consider contacting a qualified clinician if symptoms or abnormal readings persist.");
        } else {
            recommendation.setCategory("recovery");
            recommendation.setPriority("normal");
            recommendation.setTitle("Keep the momentum gentle");
            recommendation.setMessage("Balance movement, hydration, protein-rich meals, and consistent sleep. The starter engine will become smarter as more signals are connected.");
        }
        return recommendation;
    }
}
