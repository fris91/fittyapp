package com.fitty.recommendation.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Thin client for an OpenAI-compatible local API (LM Studio).
 *
 * <p>Only used server-side. Adds bounded timeouts and never logs prompt/response bodies, which may
 * contain wellness context. Throws on any failure so the caller can fall back to rule-based output.
 */
@Component
public class LmStudioClient {
    private static final Logger log = LoggerFactory.getLogger(LmStudioClient.class);

    private final AiProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public LmStudioClient(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(properties.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(properties.readTimeoutMs()));
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(factory);
        if (properties.apiKey() != null && !properties.apiKey().isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + properties.apiKey());
        }
        this.restClient = builder.build();
    }

    public boolean isEnabled() {
        return properties.enabled();
    }

    /**
     * Calls the chat completions endpoint and returns the raw assistant message content.
     *
     * @throws RuntimeException if the endpoint is unreachable, times out, or returns no content.
     */
    public String complete(String model, String systemPrompt, String userPrompt) {
        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0.4,
                "max_tokens", properties.maxTokens(),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)));

        long started = System.currentTimeMillis();
        try {
            String raw = restClient.post()
                    .uri("/v1/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode root = objectMapper.readTree(raw);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                throw new IllegalStateException("LM Studio returned empty content");
            }
            log.info("ai.lmstudio.ok model={} latencyMs={}", model, System.currentTimeMillis() - started);
            return content.asText();
        } catch (Exception ex) {
            // Metadata only: never log prompt/response payloads.
            log.warn("ai.lmstudio.fail model={} latencyMs={} reason={}", model,
                    System.currentTimeMillis() - started, ex.getClass().getSimpleName());
            throw new AiUnavailableException("LM Studio call failed", ex);
        }
    }

    public static class AiUnavailableException extends RuntimeException {
        public AiUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
