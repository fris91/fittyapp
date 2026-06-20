package com.fitty.recommendation.ai;

import com.fitty.recommendation.ai.AiDtos.AiKind;
import com.fitty.recommendation.ai.AiDtos.AiRequest;
import com.fitty.recommendation.ai.AiDtos.AiSuggestion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Typed, bounded AI endpoints. Identity stays server-side: only de-identified wellness context in
 * the request body is ever used to build prompts. {@code X-User-Id} is accepted for log correlation
 * only and is never forwarded to LM Studio.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiController {
    private static final Logger log = LoggerFactory.getLogger(AiController.class);

    private final AiSuggestionService service;

    public AiController(AiSuggestionService service) {
        this.service = service;
    }

    @PostMapping("/recommendations")
    public AiSuggestion recommendations(@RequestBody(required = false) AiRequest request,
                                        @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return handle(AiKind.RECOMMENDATION, request, userId);
    }

    @PostMapping("/nutrition-suggestion")
    public AiSuggestion nutrition(@RequestBody(required = false) AiRequest request,
                                  @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return handle(AiKind.NUTRITION, request, userId);
    }

    @PostMapping("/workout-suggestion")
    public AiSuggestion workout(@RequestBody(required = false) AiRequest request,
                                @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return handle(AiKind.WORKOUT, request, userId);
    }

    @PostMapping("/explain")
    public AiSuggestion explain(@RequestBody(required = false) AiRequest request,
                                @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return handle(AiKind.EXPLAIN, request, userId);
    }

    private AiSuggestion handle(AiKind kind, AiRequest request, String userId) {
        AiSuggestion suggestion = service.suggest(kind, request);
        // Metadata only: correlation id + source, never the prompt/context.
        log.info("ai.request kind={} user={} source={}", kind, mask(userId), suggestion.source());
        return suggestion;
    }

    private String mask(String userId) {
        if (userId == null || userId.isBlank()) {
            return "anon";
        }
        return userId.length() <= 8 ? userId : userId.substring(0, 8) + "…";
    }
}
