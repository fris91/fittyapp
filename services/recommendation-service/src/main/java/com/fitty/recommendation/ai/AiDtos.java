package com.fitty.recommendation.ai;

import java.util.List;

/**
 * Typed, bounded request/response contracts for the AI layer.
 *
 * <p>The request carries only de-identified wellness context. No user id, name or email must ever
 * be placed here or forwarded to LM Studio. The caller resolves identity from the JWT and keeps it
 * server-side.
 */
public final class AiDtos {
    private AiDtos() {
    }

    /** Kind of suggestion requested. Mapped to the right local model + prompt template. */
    public enum AiKind {
        RECOMMENDATION,
        NUTRITION,
        WORKOUT,
        EXPLAIN
    }

    /** De-identified structured user context used to build the prompt. */
    public record UserContext(
            List<String> goals,
            String activityLevel,
            String subscriptionPlan,
            BodyTrend bodyTrend,
            Nutrition nutrition,
            Double sleepHours,
            Integer hydrationGlasses) {
    }

    public record BodyTrend(Double currentWeightKg, Double weeklyDeltaKg, Double bmi, Double bodyFatPercentage) {
    }

    public record Nutrition(Integer calories, Integer caloriesTarget, Integer proteinGrams, Integer proteinTarget) {
    }

    /** Generic AI request. {@code question} is only used by EXPLAIN. */
    public record AiRequest(UserContext context, String question) {
    }

    public enum AiSource {
        LM_STUDIO,
        RULE_BASED_FALLBACK
    }

    /** Structured, bounded AI answer returned to clients. */
    public record AiSuggestion(
            String category,
            String priority,
            String title,
            String message,
            String why,
            String suggestedAction,
            String disclaimer,
            AiSource source) {
    }
}
