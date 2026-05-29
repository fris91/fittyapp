# API Summary

All client calls go through the API Gateway. In local Kubernetes the gateway is exposed at `http://fitty-cp-01:30080`.

Client requests must include a Keycloak access token:

```http
Authorization: Bearer <keycloak-access-token>
```

The gateway validates the token and forwards `X-User-Id`, `X-User-Email`, and `X-User-Roles` to backend services.

## Identity

Fitty owns the user-facing login and registration UI. The app calls `identity-service` through the gateway; the service creates or updates the Keycloak user, stores Fitty profile data through `user-service`, and returns Keycloak tokens.

- Keycloak realm: `fitty`
- Local Keycloak URL: `http://fitty-cp-01:30081`
- Mobile token client: `fitty-mobile`
- Web client for future browser redirects: `fitty-web`

Public endpoints:

- `POST /api/v1/identity/register`
- `POST /api/v1/identity/login`

`POST /api/v1/identity/register` accepts Fitty onboarding data plus consent and optional social identity metadata. It stores identity attributes in Keycloak:

- `subscriptionPlan`
- `locale`
- `goals`
- `activityLevel`
- `connectedProvider`
- `wellnessDataProcessingConsent`
- `medicalBoundaryAccepted`
- `socialProvider`
- `socialSubject`

The legacy `auth-service` endpoints remain during migration but should not be used for new frontend/mobile flows.

## Users

- `POST /api/v1/user-service`
- `PUT /api/v1/user-service`
- `GET /api/v1/user-service`
- `GET /api/v1/user-service/findUserById/{user-id}`

## Admin Users

Requires `FITTY_ADMIN`.

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/{id}`
- `PATCH /api/v1/admin/users/{id}`
- `GET /api/v1/admin/users/{id}/plans`
- `PATCH /api/v1/admin/users/{id}/subscription`

Admin endpoints expose profile, subscription and plan-level data only. They must not expose sensitive health measurements.

## Health Data

- `POST /api/v1/health-data`
- `GET /api/v1/health-data/latest`
- `GET /api/v1/health-data/history`
- `GET /api/v1/health-data/providers`

Health data is scoped to the authenticated `X-User-Id`. Admin-only requests are forbidden by `health-data-service`.

## Recommendations

- `GET /api/v1/recommendations/latest`
- `GET /api/v1/recommendations`

## Meals

- `POST /api/v1/meal-service`
- `GET /api/v1/meal-service`
- `GET /api/v1/meal-service/{meal-id}`

## Notifications

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{id}/read`
