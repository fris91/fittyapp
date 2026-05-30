package com.fitty.user_service.api.dto;

/**
 * Aggregated payload for the mobile Today screen.
 * Ring values are 0..100 percentages so the client renders rings without doing math.
 */
public record MobileTodayResponse(
        String firstName,
        String focus,
        Rings rings,
        Integer streakDays,
        String coachLine,
        String disclaimer
) {
    public record Rings(Integer move, Integer meals, Integer body) {
    }
}
