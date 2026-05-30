# Fitty Mobile MVP Slice

This slice aligns the Expo app with the approved mobile-first direction in `wireframes/Fitty Mobile UI - Clean.html`.

## Implemented

- Onboarding before account creation:
  - Welcome
  - Goal
  - Body basics
  - Activity
  - Optional connection
  - Account and consent
  - Narrated building state
  - First Today screen
- Bottom navigation:
  - Today
  - Progress
  - raised `+ Log`
  - Plans
  - Coach
- Today follows the Habit / Progress concept:
  - one daily focus card
  - Move / Meals / Body rings
  - weekly streak
  - inline coach card
- Quick-log bottom sheet:
  - Meal
  - Workout
  - Body data
  - Water/Mood
- Progress, Plans, Coach and Settings surfaces include empty/loading/error-ready state patterns.
- AI and health surfaces include a visible wellness guidance boundary.

## Mock-First API Layer

`mobile-app/src/api.ts` exposes typed client functions that call the Kubernetes API Gateway by default:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.192:30080
EXPO_PUBLIC_USE_MOCKS=false
```

Use mocks only while working on isolated UI:

```bash
EXPO_PUBLIC_USE_MOCKS=true
```

## Next Slice

- Replace static screen state with calls to the typed API layer.
- Persist onboarding output as profile/goals through the gateway.
- Connect quick-log save actions to meal and health endpoints.

## Identity UX Direction

Keycloak is the Identity Provider, not the user-facing product UI.

The app should own the registration and confirmation screens. During registration it collects:

- social identity data from Google/Facebook when used
- email/password when used
- onboarding profile data
- consent flags
- subscription plan and locale defaults

The backend should then create or update the Keycloak user through the Keycloak Admin API and store product profile data in Fitty services. The user should not need to open the Keycloak admin/account UI during the normal app flow.

Google and Facebook login must still be configured in Keycloak as identity providers, but Fitty should present them as normal in-app login buttons and handle the result as part of the Fitty onboarding journey.

The first backend slice is `identity-service`:

- `POST /api/v1/identity/register` creates or updates the Keycloak user, applies the `FITTY_USER` role, stores onboarding attributes, creates a Fitty user profile, and returns tokens when an email/password credential is present.
- `POST /api/v1/identity/login` exchanges email/password for Keycloak tokens through the `fitty-mobile` client.
- The mobile app stores the returned session in `mobile-app/src/session.ts`. Install `expo-secure-store` for device-persistent secure storage; without it, the development fallback is in-memory only.
- Social login currently accepts provider metadata as registration input; real Google/Facebook token exchange should be added through Keycloak identity provider configuration before production use.
