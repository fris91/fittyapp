package com.fitty.recommendation.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitty.recommendation.ai.AiDtos.AiKind;
import com.fitty.recommendation.ai.AiDtos.AiRequest;
import com.fitty.recommendation.ai.AiDtos.AiSource;
import com.fitty.recommendation.ai.AiDtos.AiSuggestion;
import com.fitty.recommendation.ai.AiDtos.Nutrition;
import com.fitty.recommendation.ai.AiDtos.UserContext;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AiSuggestionServiceTest {

    private AiSuggestionService serviceWithAiDisabled() {
        AiProperties properties = new AiProperties(false, null, null, null, 0, 0, 0);
        ObjectMapper mapper = new ObjectMapper();
        LmStudioClient client = new LmStudioClient(properties, mapper);
        return new AiSuggestionService(client, properties, mapper);
    }

    @Test
    void fallsBackToRuleBasedWhenAiDisabled() {
        AiSuggestionService service = serviceWithAiDisabled();
        UserContext context = new UserContext(
                List.of("Perdere peso"), "Sedentario", "FREE", null,
                new Nutrition(80, 120, 60, 120), 6.0, 4);

        AiSuggestion suggestion = service.suggest(AiKind.NUTRITION, new AiRequest(context, null));

        assertThat(suggestion.source()).isEqualTo(AiSource.RULE_BASED_FALLBACK);
        assertThat(suggestion.disclaimer()).isEqualTo(AiSuggestionService.DISCLAIMER);
        assertThat(suggestion.priority()).isEqualTo("high"); // protein below target
        assertThat(suggestion.message()).isNotBlank();
    }

    @Test
    void everySuggestionCarriesDisclaimerAndBoundedCategory() {
        AiSuggestionService service = serviceWithAiDisabled();
        for (AiKind kind : AiKind.values()) {
            AiSuggestion suggestion = service.suggest(kind, new AiRequest(null, "perché?"));
            assertThat(suggestion.disclaimer()).contains("non un parere medico");
            assertThat(suggestion.category()).isIn("movement", "nutrition", "recovery", "hydration", "risk", "general");
            assertThat(suggestion.source()).isEqualTo(AiSource.RULE_BASED_FALLBACK);
        }
    }
}
