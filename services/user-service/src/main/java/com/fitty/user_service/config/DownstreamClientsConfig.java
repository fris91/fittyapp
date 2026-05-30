package com.fitty.user_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * RestClient beans for downstream service calls used by the mobile BFF.
 * URLs are injected from the fitty-app-config ConfigMap (envFrom in K8s).
 * Localhost fallbacks let unit-style runs work without K8s.
 */
@Configuration
public class DownstreamClientsConfig {

    @Bean
    public RestClient healthDataRestClient(
            @Value("${HEALTH_DATA_SERVICE_URL:http://localhost:8083}") String baseUrl) {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(timeoutFactory())
                .build();
    }

    @Bean
    public RestClient recommendationRestClient(
            @Value("${RECOMMENDATION_SERVICE_URL:http://localhost:8084}") String baseUrl) {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(timeoutFactory())
                .build();
    }

    private SimpleClientHttpRequestFactory timeoutFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofMillis(800).toMillis());
        factory.setReadTimeout((int) Duration.ofMillis(1500).toMillis());
        return factory;
    }
}
