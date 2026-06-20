# Social Login — Google & Facebook (brokered by Keycloak)

Fitty shows branded "Continua con Google / Facebook" buttons, but the providers are **brokered by
Keycloak** — the app never implements OAuth directly. The web buttons start an Authorization Code +
PKCE flow against Keycloak with `kc_idp_hint=google|facebook`; Keycloak redirects to the provider and
back. After login the app calls `POST /api/v1/identity/sync-profile` to ensure a Fitty profile exists.

The `fitty` realm already declares both identity providers, **disabled**, with env-substituted
credentials (`infra/k8s/local/keycloak/fitty-realm-configmap.yaml`):

```json
{ "alias": "google",   "providerId": "google",   "enabled": false,
  "config": { "clientId": "${GOOGLE_CLIENT_ID}",   "clientSecret": "${GOOGLE_CLIENT_SECRET}",   "syncMode": "IMPORT" } },
{ "alias": "facebook", "providerId": "facebook", "enabled": false,
  "config": { "clientId": "${FACEBOOK_CLIENT_ID}", "clientSecret": "${FACEBOOK_CLIENT_SECRET}", "syncMode": "IMPORT" } }
```

## Exact redirect URIs

Register these as the **Authorized redirect URI** in each provider console:

- Google:   `http://fitty-cp-01:30081/realms/fitty/broker/google/endpoint`
- Facebook: `http://fitty-cp-01:30081/realms/fitty/broker/facebook/endpoint`

> Providers often require a public HTTPS callback. `http://fitty-cp-01` is LAN-only, so for real
> Google/Facebook apps you typically need a public hostname / tunnel (e.g. a reverse proxy or
> ngrok) and must register that callback instead. Document the chosen hostname here when you set it.

## 1. Create the provider credentials

**Google** — https://console.cloud.google.com/apis/credentials
1. Create / select a project → *OAuth consent screen* (External, add your test users).
2. *Credentials* → *Create credentials* → *OAuth client ID* → *Web application*.
3. Add the Google redirect URI above. Copy the **Client ID** and **Client secret**.

**Facebook** — https://developers.facebook.com/apps
1. Create an app (type *Consumer*) → add the *Facebook Login* product.
2. *Facebook Login → Settings* → add the Facebook redirect URI above to *Valid OAuth Redirect URIs*.
3. From *App settings → Basic*, copy the **App ID** and **App secret**.

## 2. Put credentials into Kubernetes

Copy the template to a gitignored file and fill the four values:

```powershell
copy infra\k8s\local\keycloak\keycloak-secrets.template.yaml infra\k8s\local\keycloak\keycloak-secrets.yaml
# edit keycloak-secrets.yaml: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET
kubectl apply -f infra\k8s\local\keycloak\keycloak-secrets.yaml
```

(The same `GOOGLE_CLIENT_ID` / `FACEBOOK_CLIENT_ID` placeholders also exist in
`fitty-app-config.yaml` / `app-secrets.template.yaml` for app-side reference, but Keycloak is the
component that actually performs the OAuth exchange, so the **keycloak-secrets** values are the ones
that matter.)

## 3. Enable the providers

The realm only re-imports `${ENV}` substitutions on a **clean** Keycloak database. Two options:

**A. Admin console (no data loss)** — `http://fitty-cp-01:30081`, realm `fitty`,
*Identity providers → google / facebook* → paste Client ID/Secret → toggle **Enabled = On** → Save.

**B. Clean re-import** — set `enabled: true` for the providers in the realm configmap, then reset the
Keycloak PVC so the realm is re-imported with the env-substituted credentials:

```powershell
kubectl delete deployment -n fitty-system keycloak --ignore-not-found
kubectl delete statefulset -n fitty-system keycloak-postgres --ignore-not-found
kubectl delete pvc -n fitty-system keycloak-postgres-data --ignore-not-found
kubectl apply -f infra\k8s\local\keycloak\
```

## 4. Restart Keycloak

```powershell
kubectl rollout restart deployment -n fitty-system keycloak
kubectl get pods -n fitty-system -w
```

## 5. Verify

- The providers appear at: `http://fitty-cp-01:30081/realms/fitty/account` → *Account security → Linked accounts*.
- The web buttons redirect to the provider when clicked (no "provider not found" error).
- After social login the app calls `POST /api/v1/identity/sync-profile`; confirm a Fitty profile now
  exists:

```powershell
# {keycloak-user-id} is the `sub` from the token
curl.exe http://fitty-cp-01:30080/api/v1/user-service/exists/{keycloak-user-id}
```

## Still requires external setup

- Google OAuth client (ID + secret) and a reachable redirect URI.
- Facebook app (App ID + secret) and a reachable redirect URI.
- A public callback hostname if the providers reject the LAN `http://fitty-cp-01` URL.
