package com.fitty.user_service.impl.controller;

import com.fitty.user_service.api.dto.MobileProgressResponse;
import com.fitty.user_service.api.dto.MobileTodayResponse;
import com.fitty.user_service.impl.service.MobileBffService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Mobile backend-for-frontend.
 *
 * Each endpoint composes the screen's data from multiple services so the
 * mobile app makes a single call per surface. The gateway injects user
 * identity headers; we just forward them downstream.
 */
@RestController
@RequestMapping("/api/v1/mobile")
@RequiredArgsConstructor
public class MobileBffController {

    private final MobileBffService service;

    @GetMapping("/today")
    public MobileTodayResponse today(
            @RequestHeader(value = "X-User-Id", defaultValue = "") String userId,
            @RequestHeader(value = "X-User-Email", defaultValue = "") String userEmail,
            @RequestHeader(value = "X-User-Roles", defaultValue = "") String userRoles) {
        return service.today(userId, userEmail, userRoles);
    }

    @GetMapping("/progress")
    public MobileProgressResponse progress(
            @RequestHeader(value = "X-User-Id", defaultValue = "") String userId,
            @RequestHeader(value = "X-User-Email", defaultValue = "") String userEmail,
            @RequestHeader(value = "X-User-Roles", defaultValue = "") String userRoles) {
        return service.progress(userId, userEmail, userRoles);
    }
}
