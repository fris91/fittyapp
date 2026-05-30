# Fitty Multi-Agent Context

This file is the shared handoff context for future Codex/sub-agent work on Fitty. Keep it updated whenever a meaningful product, architecture, or deployment decision changes.

## Current Goal

Fitty is being moved from a simple PoC toward a local-first, Kubernetes-ready wellness platform with:

- Keycloak-backed identity.
- Fitty-owned mobile/web registration and login UX.
- Separate user and admin experiences.
- Protected health data scoped to the authenticated user.
- Real service boundaries instead of hardcoded/mock-only frontend flows.
- Mobile-first product UX based on the approved wireframes.

## Local Runtime

Primary runtime is the local Kubernetes cluster.

- Control plane: `fitty-cp-01`, usually `192.168.1.192`.
- Worker: `fitty-worker-01`, usually `192.168.1.41`.
- Local registry: `fitty-cp-01:5000`.
- Web app: `http://fitty-cp-01:30000`.
- API Gateway: `http://fitty-cp-01:30080`.
- Keycloak: `http://fitty-cp-01:30081`.
- Kafka UI: `http://fitty-cp-01:30090`.

Docker Compose is legacy/dev convenience only. Do not optimize the project around Compose unless explicitly asked.

## Active Services

Expected local K8s services:

- `api-gateway`
- `auth-service` legacy/migration only
- `identity-service`
- `user-service`
- `health-data-service`
- `recommendation-service`
- `nutrition-service` / `meal-service`
- `notification-service`
- `web-app`
- `postgres`
- `mongo`
- `kafka`
- `kafka-ui`
- `keycloak`
- `keycloak-postgres`

## Identity Decisions

Keycloak is the central Identity Provider, but it must not be the normal user-facing registration UI.

Fitty owns the user experience:

- Mobile/web collect onboarding data, account data, consent flags, and optional social provider data.
- App calls Fitty APIs through the gateway.
- `identity-service` talks to Keycloak Admin API behind the scenes.
- `identity-service` creates or updates the Keycloak user.
- `identity-service` assigns `FITTY_USER`.
- `identity-service` stores identity attributes in Keycloak.
- `identity-service` creates the Fitty user profile through `user-service`.
- Login returns Keycloak tokens to the app.
- Password reset is exposed as `POST /api/v1/identity/password-reset` and uses Keycloak action emails. Real email delivery requires SMTP configuration in the `fitty` realm.

Do not implement direct Google/Facebook login inside the app services. Google/Facebook must be configured as Keycloak identity providers. The Fitty UI may show branded buttons, but Keycloak remains the broker/provider behind the integration.

Current local identity endpoints:

- `POST /api/v1/identity/register`
- `POST /api/v1/identity/login`
- `POST /api/v1/identity/password-reset`

Gateway route:

- `/api/v1/identity/**` -> `identity-service`

Current Keycloak clients:

- `fitty-web`
- `fitty-mobile`
- `fitty-admin`
- `fitty-api`

Current roles:

- `FITTY_USER`
- `FITTY_ADMIN`
- `FITTY_COACH`
- `FITTY_SUPPORT`

Important local caveat:

- `fitty-mobile` currently needs direct access grants enabled for the app-owned email/password login exchange.
- The API Gateway must validate tokens against the issuer Keycloak actually writes into tokens. For the app-owned login flow this is currently the in-cluster issuer: `http://keycloak.fitty-system.svc.cluster.local:8080/realms/fitty`.
- If the realm already exists, changing `fitty-realm-configmap.yaml` may not re-import the realm automatically. Update it in the Keycloak admin console or intentionally reset the local Keycloak PVC.

## Sensitive Data Boundary

Admins may view:

- User anagraphic/profile data.
- Active subscription plan.
- User type/role.
- Workout plans.
- Nutrition plans.

Admins must not view sensitive health measurements:

- Heart rate.
- Blood pressure.
- Steps.
- Clinical measurements.
- Body measurements if treated as sensitive.

This must be enforced in backend authorization, not only hidden in frontend navigation.

## Product UX Decisions

Mobile-first UX follows the approved clean mobile direction in `wireframes/Fitty Mobile UI - Clean.html`.

Non-negotiable product decisions:

- Home/Today is a Habit/Progress concept, not a dense dashboard.
- Bottom navigation has main sections, but it has been expanded beyond the earlier minimal version:
  - Today
  - Training
  - Nutrition
  - Coach
  - Raised quick log action
- Profile/settings is reached from the avatar/header.
- Logging must stay fast, but training and nutrition are not just logs. They need full dedicated areas.
- Training needs views for workout plan, exercise execution, weights used, strength progression, resistance, and estimated calories burned.
- Nutrition needs meal logging, plans, recipes/library, macros, and future plate recognition.
- Onboarding happens before account completion.
- AI must be editable, explainable, bounded, and must show a wellness/medical disclaimer.
- Empty/loading/error states are required for data surfaces.
- No fake authenticated dashboard before login.

## Mobile App State

The Expo app has been moved to SDK 54 to work with the current Expo Go.

Current mobile direction:

- `mobile-app/src/api.ts` defaults to real gateway calls:
  - `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.192:30080`
  - mocks only when `EXPO_PUBLIC_USE_MOCKS=true`
- Account step in onboarding now calls `registerIdentity(...)`.
- Existing-user login calls `loginIdentity(...)`.
- Mobile session persistence lives in `mobile-app/src/session.ts`; it uses `expo-secure-store` when installed and falls back to memory during local development.
- Saved access tokens are passed to protected API calls from the quick-log flow.
- Quick-log keyboard issue was addressed with dismiss behavior and done controls.

Remaining mobile work:

- Wire Google/Facebook social login properly through Keycloak/provider flow.
- Replace static Today/Training/Nutrition/Coach state with gateway-backed data.
- Add Android/iOS production build path beyond Expo Go.

## Current Identity Slice

New service path:

- `services/identity-service`

Kubernetes manifest:

- `infra/k8s/local/identity-service/identity-service.yaml`

Gateway files changed:

- `services/gateway-service/src/main/resources/application.yml`
- `services/gateway-service/src/main/java/com/fitty/gateway_service/config/SecurityConfig.java`

User-service mapper changed:

- `services/user-service/src/main/java/com/fitty/user_service/mapper/UserMapper.java`
- It now preserves the incoming user ID so the Fitty profile can use the Keycloak user ID.

Docs updated:

- `docs/api.md`
- `docs/mobile-mvp.md`
- `docs/infra/local/README.md`

## Build and Deploy Commands

After identity/gateway/user-service changes:

```powershell
cd E:\workspace\fittyApp

docker build -t fitty-cp-01:5000/fitty/identity-service:local .\services\identity-service
docker build -t fitty-cp-01:5000/fitty/api-gateway:local .\services\gateway-service
docker build -t fitty-cp-01:5000/fitty/user-service:local .\services\user-service

docker push fitty-cp-01:5000/fitty/identity-service:local
docker push fitty-cp-01:5000/fitty/api-gateway:local
docker push fitty-cp-01:5000/fitty/user-service:local

kubectl apply -f .\infra\k8s\local\configmaps\
kubectl apply -f .\infra\k8s\local\secrets\
kubectl apply -f .\infra\k8s\local\keycloak\
kubectl apply -f .\infra\k8s\local\identity-service\
kubectl apply -f .\infra\k8s\local\api-gateway\
kubectl apply -f .\infra\k8s\local\user-service\

kubectl rollout restart deployment -n fitty-app identity-service
kubectl rollout restart deployment -n fitty-app api-gateway
kubectl rollout restart deployment -n fitty-app user-service
kubectl get pods -n fitty-app -w
```

## Verification Commands

Check Keycloak:

```powershell
curl.exe http://fitty-cp-01:30081/realms/fitty/.well-known/openid-configuration
```

Register a user through Fitty:

```powershell
curl.exe -X POST http://fitty-cp-01:30080/api/v1/identity/register `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"mobile.test@fitty.local\",\"password\":\"Password123!\",\"firstName\":\"Mobile\",\"lastName\":\"Test\",\"locale\":\"it-IT\",\"subscriptionPlan\":\"FREE\",\"goals\":[\"Feel healthier\"],\"bodyBasics\":{\"sex\":\"M\",\"age\":35,\"heightCm\":178,\"weightKg\":82},\"activityProfile\":{\"activityLevel\":\"Lightly active\"},\"consent\":{\"wellnessDataProcessing\":true,\"medicalBoundaryAccepted\":true,\"marketing\":false}}"
```

Login through Fitty:

```powershell
curl.exe -X POST http://fitty-cp-01:30080/api/v1/identity/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"mobile.test@fitty.local\",\"password\":\"Password123!\"}"
```

Check pods:

```powershell
kubectl get pods -A -o wide
kubectl logs -n fitty-app deploy/identity-service --tail=200
kubectl logs -n fitty-app deploy/api-gateway --tail=200
```

## Known Issues / Caveats

- Local Maven on Windows failed because Java could not validate Maven Central TLS certificates (`PKIX path building failed`). Docker build should still work when Docker daemon is available because the build happens inside the Maven image.
- Docker Desktop was not running during the last verification attempt, so identity-service Docker build was not completed locally.
- Google/Facebook buttons in the mobile app are still placeholders. They must be wired to a real provider/Keycloak flow later.
- Tokens are not yet persisted in secure storage in the mobile app.
- Static mobile screens still need to be replaced with real gateway-backed data.
- `auth-service` still exists as legacy. Do not build new frontend/mobile flows on it.
- Some docs contain old tree glyph encoding artifacts; avoid expanding that issue unless editing the relevant section.

## Recommended Next Slices

1. Build/deploy `identity-service`, gateway and user-service; test register/login end to end.
2. Store mobile access/refresh token securely and attach it to API calls.
3. Add an existing-user login screen.
4. Make Today fetch real user/profile/summary data.
5. Implement Training service/module foundation:
   - workout plans
   - exercise sets
   - weights used
   - progression history
   - calorie estimate
6. Implement Nutrition service/module foundation:
   - manual meal logging
   - macros/calories
   - nutrition plans
   - plate recognition placeholder
7. Add backend enforcement that admins cannot read sensitive health/body measurement endpoints.
8. Replace random recommendations with deterministic rule-based recommendations based on actual user data.
9. Add tests around identity registration, JWT role mapping, health access control, and admin subscription update.

## How Agents Should Work Here

- Read the repo before editing.
- Prefer small vertical slices.
- Preserve Kubernetes as primary runtime.
- Do not remove working manifests or local registry assumptions.
- Do not expose sensitive health data to admins.
- Do not show fake authenticated dashboards before login.
- Keep docs updated after any architecture decision.
- When changing identity behavior, update this file too.
