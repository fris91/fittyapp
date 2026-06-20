# Fitty Integrations

External integrations and the credentials/secrets they need. All are **off by default** and degrade
gracefully until configured.

| Integration | Purpose | Status without config | Guide |
| --- | --- | --- | --- |
| LM Studio (local AI) | `/api/v1/ai/**` wellness suggestions | Rule-based fallback (`source: RULE_BASED_FALLBACK`) | [lm-studio-ai.md](lm-studio-ai.md) |
| Google login | Social sign-in (brokered by Keycloak) | Button visible, provider disabled | [oauth-google-facebook.md](oauth-google-facebook.md) |
| Facebook login | Social sign-in (brokered by Keycloak) | Button visible, provider disabled | [oauth-google-facebook.md](oauth-google-facebook.md) |
| SMTP email | Password reset & email verification | Endpoint returns 202, no email sent | [smtp-email.md](smtp-email.md) |
| Google Fit / Apple Health / Health Connect | Health data sync | **Placeholder only — not wired.** Do not present as working. | _todo_ |

## Where secrets live

- App services: `infra/k8s/local/secrets/app-secrets.template.yaml` → copy to `app-secrets.yaml` (gitignored).
- Keycloak (OAuth providers, SMTP): `infra/k8s/local/keycloak/keycloak-secrets.template.yaml` → copy to `keycloak-secrets.yaml`.
- Non-secret config: `infra/k8s/local/configmaps/app-config.yaml`.

Never commit real credentials. Apply the copied `*.yaml` files, not the `*.template.yaml` ones.
