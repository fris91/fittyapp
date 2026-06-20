package com.fitty.recommendation.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the local LM Studio (OpenAI-compatible) AI layer.
 *
 * <p>All values are environment driven so the same image can run against LM Studio locally,
 * a different OpenAI-compatible endpoint, or be disabled entirely (rule-based fallback only).
 */
@ConfigurationProperties(prefix = "fitty.ai")
public record AiProperties(
        boolean enabled,
        String baseUrl,
        String apiKey,
        Models models,
        int connectTimeoutMs,
        int readTimeoutMs,
        int maxTokens) {

    public record Models(String fitness, String medical, String reasoning) {
    }

    public AiProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://host.docker.internal:1234";
        }
        if (models == null) {
            models = new Models("local-fitness", "local-medical", "local-reasoning");
        }
        if (connectTimeoutMs <= 0) {
            connectTimeoutMs = 1500;
        }
        if (readTimeoutMs <= 0) {
            readTimeoutMs = 8000;
        }
        if (maxTokens <= 0) {
            maxTokens = 512;
        }
    }
}
