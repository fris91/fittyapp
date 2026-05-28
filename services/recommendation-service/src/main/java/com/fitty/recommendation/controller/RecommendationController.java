package com.fitty.recommendation.controller;

import com.fitty.recommendation.domain.Recommendation;
import com.fitty.recommendation.service.RecommendationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {
    private final RecommendationService service;

    public RecommendationController(RecommendationService service) {
        this.service = service;
    }

    @GetMapping("/latest")
    Recommendation latest(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId) {
        return service.latest(userId);
    }

    @GetMapping
    List<Recommendation> list(@RequestHeader(value = "X-User-Id", defaultValue = "local-user") String userId) {
        return service.list(userId);
    }
}
