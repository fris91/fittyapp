package com.fitty.user_service.impl.service;

import com.fitty.user_service.api.dto.MobileProgressResponse;
import com.fitty.user_service.api.dto.MobileTodayResponse;
import com.fitty.user_service.api.dto.UserResponse;
import com.fitty.user_service.impl.exception.UserNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Mobile BFF aggregator. Composes data from user-service (local),
 * health-data-service and recommendation-service into a single payload.
 *
 * Downstream failures must never break the screen — every call is wrapped
 * and falls back to a sensible default. The client already renders empty
 * states; this BFF preserves those affordances rather than 500-ing.
 */
@Service
@Slf4j
public class MobileBffService {

    private static final String DEFAULT_FOCUS = "Start with a 15-minute walk today";
    private static final String DEFAULT_COACH_LINE =
            "Log your first meal or body data to start your streak.";
    private static final String DISCLAIMER =
            "Wellness guidance, not medical advice.";

    private final UserService userService;
    private final RestClient healthDataRestClient;
    private final RestClient recommendationRestClient;

    public MobileBffService(UserService userService,
                            @Qualifier("healthDataRestClient") RestClient healthDataRestClient,
                            @Qualifier("recommendationRestClient") RestClient recommendationRestClient) {
        this.userService = userService;
        this.healthDataRestClient = healthDataRestClient;
        this.recommendationRestClient = recommendationRestClient;
    }

    public MobileTodayResponse today(String userId, String userEmail, String userRoles) {
        String firstName = safeFirstName(userId);
        Map<String, Object> latestHealth = fetchLatestHealth(userId, userEmail, userRoles);
        List<Map<String, Object>> history = fetchHealthHistory(userId, userEmail, userRoles);
        Map<String, Object> latestRecommendation = fetchLatestRecommendation(userId);

        MobileTodayResponse.Rings rings = new MobileTodayResponse.Rings(
                moveRing(latestHealth),
                0,                       // Slice 3 wires this from ate-meal count
                bodyRing(latestHealth)
        );

        String focus = pickFocus(latestRecommendation);
        String coachLine = pickCoachLine(latestRecommendation);
        Integer streak = computeStreak(history);

        return new MobileTodayResponse(firstName, focus, rings, streak, coachLine, DISCLAIMER);
    }

    public MobileProgressResponse progress(String userId, String userEmail, String userRoles) {
        // Slice 4 will compute wellness score + weight trend from real history.
        // For now return a typed empty response so the client renders its empty state.
        List<Map<String, Object>> history = fetchHealthHistory(userId, userEmail, userRoles);
        List<Double> weightTrend = history.stream()
                .map(snapshot -> snapshot.get("weightKg"))
                .filter(value -> value instanceof Number)
                .map(value -> ((Number) value).doubleValue())
                .toList();
        Integer score = weightTrend.isEmpty() ? null : Math.min(100, 50 + weightTrend.size() * 5);
        Map<String, Object> latest = history.isEmpty() ? Collections.emptyMap() : history.get(0);
        return new MobileProgressResponse(
                score,
                doubleValue(latest.get("weightKg")),
                doubleValue(latest.get("bmi")),
                doubleValue(latest.get("bodyFatPercentage")),
                doubleValue(latest.get("muscleMassPercentage")),
                weightTrend
        );
    }

    private String safeFirstName(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        try {
            UserResponse user = userService.findUserById(userId);
            return user == null ? null : user.firstName();
        } catch (UserNotFoundException notFound) {
            return null;
        } catch (RuntimeException unexpected) {
            log.warn("Could not load profile for {} while building Today.", userId, unexpected);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchLatestHealth(String userId, String email, String roles) {
        try {
            Map<String, Object> body = healthDataRestClient.get()
                    .uri("/api/v1/health-data/latest")
                    .headers(headers -> applyUserHeaders(headers, userId, email, roles))
                    .retrieve()
                    .body(Map.class);
            return body == null ? Collections.emptyMap() : body;
        } catch (RuntimeException error) {
            log.debug("health-data/latest unavailable for {}: {}", userId, error.getMessage());
            return Collections.emptyMap();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchHealthHistory(String userId, String email, String roles) {
        try {
            List<Map<String, Object>> result = healthDataRestClient.get()
                    .uri("/api/v1/health-data/history")
                    .headers(headers -> applyUserHeaders(headers, userId, email, roles))
                    .retrieve()
                    .body(List.class);
            return result == null ? Collections.emptyList() : result;
        } catch (RuntimeException error) {
            log.debug("health-data/history unavailable for {}: {}", userId, error.getMessage());
            return Collections.emptyList();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchLatestRecommendation(String userId) {
        try {
            Map<String, Object> body = recommendationRestClient.get()
                    .uri("/api/v1/recommendations/latest")
                    .headers(headers -> headers.set("X-User-Id", userId == null ? "" : userId))
                    .retrieve()
                    .body(Map.class);
            return body == null ? Collections.emptyMap() : body;
        } catch (RuntimeException error) {
            log.debug("recommendations/latest unavailable for {}: {}", userId, error.getMessage());
            return Collections.emptyMap();
        }
    }

    private void applyUserHeaders(org.springframework.http.HttpHeaders headers,
                                  String userId, String email, String roles) {
        headers.set("X-User-Id", userId == null ? "" : userId);
        headers.set("X-User-Email", email == null ? "" : email);
        // Always include FITTY_USER so health-data does not 403 the BFF as admin-only.
        String forwardedRoles = (roles == null || roles.isBlank())
                ? "FITTY_USER"
                : (roles.contains("FITTY_USER") ? roles : roles + ",FITTY_USER");
        headers.set("X-User-Roles", forwardedRoles);
    }

    private Integer moveRing(Map<String, Object> latestHealth) {
        Object steps = latestHealth.get("steps");
        if (!(steps instanceof Number)) {
            return 0;
        }
        double pct = ((Number) steps).doubleValue() / 10_000d * 100d;
        return (int) Math.max(0, Math.min(100, Math.round(pct)));
    }

    private Integer bodyRing(Map<String, Object> latestHealth) {
        if (latestHealth.isEmpty()) {
            return 0;
        }
        // Presence of a recent snapshot fills the ring partially; richer math comes in Slice 4.
        return latestHealth.get("weightKg") instanceof Number ? 60 : 30;
    }

    private Integer computeStreak(List<Map<String, Object>> history) {
        if (history == null || history.isEmpty()) {
            return 0;
        }
        return Math.min(7, history.size());
    }

    private Double doubleValue(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private String pickFocus(Map<String, Object> latestRecommendation) {
        Object title = latestRecommendation.get("title");
        if (title instanceof String s && !s.isBlank()) {
            return s;
        }
        return DEFAULT_FOCUS;
    }

    private String pickCoachLine(Map<String, Object> latestRecommendation) {
        Object message = latestRecommendation.get("message");
        if (message instanceof String s && !s.isBlank()) {
            return s;
        }
        return DEFAULT_COACH_LINE;
    }
}
