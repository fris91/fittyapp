package com.fitty.identity.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "fitty")
public record IdentityProperties(Keycloak keycloak, UserService userService) {
    public record Keycloak(
            String baseUrl,
            String realm,
            String adminRealm,
            String adminClientId,
            String adminUsername,
            String adminPassword,
            String tokenClientId
    ) {
    }

    public record UserService(String url) {
    }
}
