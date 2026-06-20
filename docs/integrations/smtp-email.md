# Email delivery (SMTP) — verification & password reset

Fitty's password reset (`POST /api/v1/identity/password-reset`) and email verification both rely on
**Keycloak action emails** (`execute-actions-email` / `VERIFY_EMAIL`, `UPDATE_PASSWORD`). The endpoints
work and return `202 Accepted` regardless, but **no email leaves the cluster until SMTP is configured
in the `fitty` realm**. This is intentional (no email enumeration); the user always sees the same
neutral message.

## What is missing today

The `fitty` realm import has **no `smtpServer` block**, so Keycloak cannot send mail. You must add one.

## Required settings

Configure these in the realm (values from your mail provider):

| Realm SMTP field | Example | Notes |
| --- | --- | --- |
| Host | `smtp.gmail.com` | Provider SMTP host |
| Port | `587` | `587` STARTTLS or `465` SSL |
| From | `no-reply@fitty.local` | Sender address |
| From display name | `Fitty` | Optional |
| Enable StartTLS | `true` | For port 587 |
| Enable SSL | `true` | For port 465 |
| Enable Authentication | `true` | Almost always |
| Username | `apikey` / your SMTP user | Provider dependent |
| Password | *SMTP password / app password* | **Secret** |

## Recommended: env-driven realm SMTP

To keep secrets out of YAML, add an env-substituted `smtpServer` block to the realm import
(`fitty-realm-configmap.yaml`, alongside `identityProviders`) and supply the values via
`keycloak-secrets`:

```json
"smtpServer": {
  "host": "${SMTP_HOST}",
  "port": "${SMTP_PORT}",
  "from": "${SMTP_FROM}",
  "fromDisplayName": "Fitty",
  "ssl": "${SMTP_SSL}",
  "starttls": "${SMTP_STARTTLS}",
  "auth": "true",
  "user": "${SMTP_USER}",
  "password": "${SMTP_PASSWORD}"
}
```

Add to `infra/k8s/local/keycloak/keycloak-secrets.template.yaml`:

```yaml
  SMTP_HOST: ""
  SMTP_PORT: "587"
  SMTP_FROM: "no-reply@fitty.local"
  SMTP_SSL: "false"
  SMTP_STARTTLS: "true"
  SMTP_USER: ""
  SMTP_PASSWORD: ""
```

> The realm only re-imports on a clean Keycloak DB. Either add the block then reset the Keycloak PVC
> (see oauth-google-facebook.md, option B), or configure SMTP directly in the admin console:
> `http://fitty-cp-01:30081` → realm `fitty` → *Realm settings → Email*.

## Verify

```powershell
# Should return 202 and, once SMTP is configured, deliver a reset email.
curl.exe -X POST http://fitty-cp-01:30080/api/v1/identity/password-reset `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"mobile.test@fitty.local\"}"

kubectl logs -n fitty-system deploy/keycloak --tail=100   # look for mail send / errors
```

## Still requires external setup

- An SMTP provider account (host, port, username, password / app password) — e.g. Gmail app password,
  SendGrid, Mailgun, Amazon SES.
- For email verification to gate login, enable *Realm settings → Login → Verify email* in the `fitty`
  realm (currently off for local development).
