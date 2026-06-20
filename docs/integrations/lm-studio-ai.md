# Fitty AI Layer — Local LM Studio

Fitty's first AI slice lives **inside `recommendation-service`** (not a separate service yet, by
decision — fewer moving parts for the first working slice). It exposes typed, bounded endpoints and
talks to a local **LM Studio** OpenAI-compatible API, with a deterministic rule-based fallback.

## Architecture

```
web/mobile ──▶ api-gateway ──▶ recommendation-service ──▶ LM Studio (OpenAI-compatible)
   (JWT)         (/api/v1/ai)        AiController                /v1/chat/completions
                                     AiSuggestionService ──▶ rule-based fallback (no network)
```

- The frontend **never** calls LM Studio directly.
- Identity stays server-side. Only **de-identified** wellness context (goals, body trend, activity,
  nutrition, sleep, hydration, plan) is ever placed in a prompt. No user id, name or email.
- Every answer carries a wellness disclaimer and a `source` of `LM_STUDIO` or `RULE_BASED_FALLBACK`.
- LM Studio calls have bounded connect/read timeouts and degrade gracefully on any error.

## Endpoints

All require a valid Fitty JWT (gateway-enforced). Body: `{ "context": {...}, "question": "..." }`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/ai/recommendations` | General wellness recommendation |
| POST | `/api/v1/ai/nutrition-suggestion` | Nutrition-focused suggestion |
| POST | `/api/v1/ai/workout-suggestion` | Training-focused suggestion |
| POST | `/api/v1/ai/explain` | Explains reasoning / answers a bounded question |

Response shape:

```json
{
  "category": "nutrition",
  "priority": "high",
  "title": "Aggiungi proteine al prossimo pasto",
  "message": "...",
  "why": "...",
  "suggestedAction": "...",
  "disclaimer": "Supporto al benessere, non un parere medico. ...",
  "source": "LM_STUDIO"
}
```

## Configuration

ConfigMap `fitty-app-config` (`infra/k8s/local/configmaps/app-config.yaml`):

| Key | Meaning | Example |
| --- | --- | --- |
| `FITTY_AI_ENABLED` | Master switch; `false` = rule-based only | `true` |
| `LM_STUDIO_BASE_URL` | LM Studio base URL reachable **from cluster pods** | `http://192.168.1.50:1234` |
| `FITTY_AI_MODEL_FITNESS` | Model id for nutrition/workout | `Llama 3.2 1B FitnessAssistant` |
| `FITTY_AI_MODEL_MEDICAL` | Model id reserved for health-sensitive prompts | `Llama Doctor 3.2 3B Instruct` |
| `FITTY_AI_MODEL_REASONING` | Model id for recommendations/explain | `mistralai/devstral-small-2-2512` |

Secret `fitty-app-secrets` (`infra/k8s/local/secrets/app-secrets.template.yaml`):

| Key | Meaning |
| --- | --- |
| `LM_STUDIO_API_KEY` | Optional. Leave empty unless LM Studio auth is enabled. |

### Important: reaching LM Studio from the cluster

`LM_STUDIO_BASE_URL` is resolved **inside the cluster pods**, not on your Windows dev box.
`localhost` will not work, and `host.docker.internal` only resolves on some runtimes.
Set it to the **LAN IP of the machine running LM Studio**, e.g. `http://192.168.1.50:1234`, and in
LM Studio enable **"Serve on local network"** so the server binds to `0.0.0.0`.

Verify reachability from a pod:

```powershell
kubectl exec -n fitty-app deploy/recommendation-service -- `
  wget -qO- http://192.168.1.50:1234/v1/models
```

## Graceful degradation

If `FITTY_AI_ENABLED=false`, or LM Studio is unreachable/slow/returns unparseable output, the service
returns a deterministic rule-based suggestion with `source: RULE_BASED_FALLBACK`. The HTTP call still
returns `200` with a useful payload — clients do not need special-casing.

## Medical boundary

- AI provides wellness guidance only and must not diagnose.
- The system prompt forbids diagnostic language and instructs the model to defer to a clinician on
  risk signals.
- Every response includes the disclaimer; the rule layer mirrors the same constraint.

## Swapping to a cloud LLM later

The layer is provider-agnostic at the HTTP boundary (OpenAI-compatible `/v1/chat/completions`).
To move to a hosted provider: point `LM_STUDIO_BASE_URL` at the provider gateway, set
`LM_STUDIO_API_KEY`, and update the model ids. No application code change is required for a
drop-in OpenAI-compatible endpoint. For a non-compatible provider, implement an alternative client
behind `AiSuggestionService` and keep the same `AiSuggestion` contract.

## What still requires external setup

- A running LM Studio instance reachable from the cluster LAN, with the three models loaded.
- If you renamed the models in LM Studio, update the `FITTY_AI_MODEL_*` config to match exactly.
