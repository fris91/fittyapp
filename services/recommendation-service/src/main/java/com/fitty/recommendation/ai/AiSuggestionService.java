package com.fitty.recommendation.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitty.recommendation.ai.AiDtos.AiKind;
import com.fitty.recommendation.ai.AiDtos.AiRequest;
import com.fitty.recommendation.ai.AiDtos.AiSource;
import com.fitty.recommendation.ai.AiDtos.AiSuggestion;
import com.fitty.recommendation.ai.AiDtos.BodyTrend;
import com.fitty.recommendation.ai.AiDtos.Nutrition;
import com.fitty.recommendation.ai.AiDtos.UserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Produces bounded wellness suggestions, preferring LM Studio and degrading gracefully to
 * deterministic rule-based output when the model is disabled or unreachable.
 *
 * <p>Medical boundary: output is wellness guidance only, never a diagnosis, and always carries a
 * disclaimer. The prompt forbids diagnostic language and the rule layer mirrors that constraint.
 */
@Service
public class AiSuggestionService {
    private static final Logger log = LoggerFactory.getLogger(AiSuggestionService.class);

    static final String DISCLAIMER =
            "Supporto al benessere, non un parere medico. Fitty non fornisce diagnosi: "
                    + "consulta un professionista sanitario per qualsiasi sintomo o dubbio clinico.";

    private static final String SYSTEM_PROMPT = """
            Sei l'assistente benessere di Fitty. Fornisci esclusivamente indicazioni di benessere
            (movimento, nutrizione, sonno, idratazione, recupero). Regole assolute:
            - Non formulare diagnosi mediche e non interpretare valori clinici.
            - Se emergono segnali di rischio, invita a consultare un professionista sanitario.
            - Resta pratico, gentile e conciso. Scrivi in italiano.
            - Rispondi SOLO con un oggetto JSON valido con queste chiavi:
              "category" (movement|nutrition|recovery|hydration|risk|general),
              "priority" (low|normal|high),
              "title" (max 60 caratteri),
              "message" (max 320 caratteri),
              "why" (max 200 caratteri, perché è utile per questo utente),
              "suggestedAction" (max 120 caratteri, azione concreta).
            Nessun testo fuori dal JSON.
            """;

    private final LmStudioClient lmStudioClient;
    private final AiProperties properties;
    private final ObjectMapper objectMapper;

    public AiSuggestionService(LmStudioClient lmStudioClient, AiProperties properties, ObjectMapper objectMapper) {
        this.lmStudioClient = lmStudioClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public AiSuggestion suggest(AiKind kind, AiRequest request) {
        UserContext context = request == null ? null : request.context();
        if (lmStudioClient.isEnabled()) {
            try {
                String model = modelFor(kind);
                String content = lmStudioClient.complete(model, SYSTEM_PROMPT, buildUserPrompt(kind, request));
                AiSuggestion parsed = parse(content);
                if (parsed != null) {
                    return parsed;
                }
                log.warn("ai.parse.fail kind={} - using rule fallback", kind);
            } catch (RuntimeException ex) {
                log.warn("ai.degraded kind={} reason={}", kind, ex.getClass().getSimpleName());
            }
        }
        return ruleBased(kind, context);
    }

    private String modelFor(AiKind kind) {
        return switch (kind) {
            case NUTRITION -> properties.models().fitness();
            case WORKOUT -> properties.models().fitness();
            case EXPLAIN -> properties.models().reasoning();
            case RECOMMENDATION -> properties.models().reasoning();
        };
    }

    String buildUserPrompt(AiKind kind, AiRequest request) {
        UserContext c = request == null ? null : request.context();
        StringBuilder sb = new StringBuilder();
        sb.append("Tipo di richiesta: ").append(kind.name()).append('\n');
        if (c != null) {
            if (c.goals() != null && !c.goals().isEmpty()) {
                sb.append("Obiettivi: ").append(String.join(", ", c.goals())).append('\n');
            }
            if (c.activityLevel() != null) {
                sb.append("Livello attività: ").append(c.activityLevel()).append('\n');
            }
            if (c.subscriptionPlan() != null) {
                sb.append("Piano: ").append(c.subscriptionPlan()).append('\n');
            }
            BodyTrend b = c.bodyTrend();
            if (b != null) {
                sb.append("Corpo: peso=").append(b.currentWeightKg())
                        .append("kg, variazione_settimanale=").append(b.weeklyDeltaKg())
                        .append("kg, bmi=").append(b.bmi())
                        .append(", massa_grassa=").append(b.bodyFatPercentage()).append("%\n");
            }
            Nutrition n = c.nutrition();
            if (n != null) {
                sb.append("Nutrizione: kcal=").append(n.calories()).append('/').append(n.caloriesTarget())
                        .append(", proteine=").append(n.proteinGrams()).append('/').append(n.proteinTarget()).append("g\n");
            }
            if (c.sleepHours() != null) {
                sb.append("Sonno: ").append(c.sleepHours()).append("h\n");
            }
            if (c.hydrationGlasses() != null) {
                sb.append("Idratazione: ").append(c.hydrationGlasses()).append(" bicchieri\n");
            }
        }
        if (kind == AiKind.EXPLAIN && request != null && request.question() != null && !request.question().isBlank()) {
            sb.append("Domanda dell'utente: ").append(request.question()).append('\n');
        }
        return sb.toString();
    }

    private AiSuggestion parse(String content) {
        try {
            String json = extractJson(content);
            JsonNode node = objectMapper.readTree(json);
            String title = text(node, "title");
            String message = text(node, "message");
            if (title.isBlank() && message.isBlank()) {
                return null;
            }
            return new AiSuggestion(
                    normalizeCategory(text(node, "category")),
                    normalizePriority(text(node, "priority")),
                    title.isBlank() ? "Suggerimento Fitty" : title,
                    message,
                    text(node, "why"),
                    text(node, "suggestedAction"),
                    DISCLAIMER,
                    AiSource.LM_STUDIO);
        } catch (Exception ex) {
            return null;
        }
    }

    /** Models sometimes wrap JSON in prose or code fences; extract the outermost JSON object. */
    private String extractJson(String content) {
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return content.substring(start, end + 1);
        }
        return content;
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText().trim();
    }

    private String normalizeCategory(String value) {
        return switch (value.toLowerCase()) {
            case "movement", "nutrition", "recovery", "hydration", "risk", "general" -> value.toLowerCase();
            default -> "general";
        };
    }

    private String normalizePriority(String value) {
        return switch (value.toLowerCase()) {
            case "low", "normal", "high" -> value.toLowerCase();
            default -> "normal";
        };
    }

    // --- Deterministic rule-based fallback -------------------------------------------------

    AiSuggestion ruleBased(AiKind kind, UserContext c) {
        List<String> goals = c == null || c.goals() == null ? List.of() : c.goals();
        boolean weightLoss = goals.stream().anyMatch(g -> g.toLowerCase().contains("peso"));
        return switch (kind) {
            case NUTRITION -> ruleNutrition(c, weightLoss);
            case WORKOUT -> ruleWorkout(c);
            case EXPLAIN -> ruleExplain(c);
            case RECOMMENDATION -> ruleRecommendation(c, weightLoss);
        };
    }

    private AiSuggestion ruleRecommendation(UserContext c, boolean weightLoss) {
        List<String> reasons = new ArrayList<>();
        if (c != null && c.sleepHours() != null && c.sleepHours() < 7) {
            reasons.add("sonno sotto le 7 ore");
        }
        if (c != null && c.hydrationGlasses() != null && c.hydrationGlasses() < 8) {
            reasons.add("idratazione da completare");
        }
        String why = reasons.isEmpty()
                ? "Costanza su movimento, nutrizione e recupero sostiene i tuoi obiettivi."
                : "Rilevati: " + String.join(", ", reasons) + ".";
        return new AiSuggestion(
                "recovery", reasons.isEmpty() ? "normal" : "high",
                weightLoss ? "Mantieni un deficit gentile e costante" : "Priorità al recupero di oggi",
                "Bilancia movimento leggero, pasti ricchi di proteine, idratazione e un sonno regolare.",
                why,
                reasons.contains("idratazione da completare") ? "Bevi 2 bicchieri d'acqua nelle prossime ore" : "Pianifica una camminata di 15 minuti",
                DISCLAIMER, AiSource.RULE_BASED_FALLBACK);
    }

    private AiSuggestion ruleNutrition(UserContext c, boolean weightLoss) {
        boolean lowProtein = c != null && c.nutrition() != null && c.nutrition().proteinGrams() != null
                && c.nutrition().proteinTarget() != null
                && c.nutrition().proteinGrams() < c.nutrition().proteinTarget();
        return new AiSuggestion(
                "nutrition", lowProtein ? "high" : "normal",
                "Aggiungi proteine al prossimo pasto",
                weightLoss
                        ? "Per una perdita di peso costante punta su proteine magre, verdura e cereali integrali in porzioni misurate."
                        : "Distribuisci le proteine nei pasti principali e includi verdura ad ogni piatto.",
                lowProtein ? "Sei sotto il target proteico giornaliero." : "Le proteine stabilizzano energia e sazietà.",
                "Inserisci una fonte proteica (legumi, uova, yogurt greco) nel prossimo pasto",
                DISCLAIMER, AiSource.RULE_BASED_FALLBACK);
    }

    private AiSuggestion ruleWorkout(UserContext c) {
        String level = c == null || c.activityLevel() == null ? "" : c.activityLevel().toLowerCase();
        boolean sedentary = level.contains("sedentar");
        return new AiSuggestion(
                "movement", "normal",
                sedentary ? "Inizia con sessioni brevi e regolari" : "Allenamento full-body a basso impatto",
                sedentary
                        ? "Tre sessioni da 20 minuti a settimana: camminata svelta e mobilità, aumentando gradualmente."
                        : "Full-body 3 giorni con esercizi composti, recuperi di 60-90 secondi e progressione graduale.",
                "Coerente con il tuo livello di attività attuale.",
                "Pianifica la prossima sessione e fermati se senti dolore",
                DISCLAIMER, AiSource.RULE_BASED_FALLBACK);
    }

    private AiSuggestion ruleExplain(UserContext c) {
        return new AiSuggestion(
                "general", "low",
                "Come ragiona Fitty",
                "I suggerimenti combinano i tuoi obiettivi, l'andamento del corpo, l'attività, la nutrizione, il sonno e l'idratazione, restando nel perimetro del benessere.",
                "Trasparenza: nessun dato clinico viene interpretato come diagnosi.",
                "Aggiorna i tuoi dati per suggerimenti più precisi",
                DISCLAIMER, AiSource.RULE_BASED_FALLBACK);
    }
}
