# Fitty PoC to Baseline Migration Note

This note records the first migration slice from a mock PoC toward a local-first Kubernetes-ready Fitty baseline.

## What Changed

- Keycloak is now the intended central Identity Provider for local Kubernetes.
- The web app no longer renders a fake logged-in dashboard for anonymous visitors.
- Login now starts an OIDC Authorization Code + PKCE flow against the local `fitty` realm.
- The frontend separates user and admin routes based on Keycloak realm roles.
- The visible UI Kit entry was removed from product navigation.
- The API Gateway now validates Keycloak JWTs and forwards derived user context headers downstream.
- Admin user endpoints were added to `user-service` for profile and subscription management.
- `health-data-service` rejects admin-only access to sensitive health measurements.

## Identity Model

Local Keycloak realm: `fitty`

Realm roles:

- `FITTY_USER`
- `FITTY_ADMIN`
- `FITTY_COACH`
- `FITTY_SUPPORT`

Clients:

- `fitty-web`: public web client using Authorization Code + PKCE.
- `fitty-mobile`: public mobile client using Authorization Code + PKCE.
- `fitty-admin`: public admin client using Authorization Code + PKCE.
- `fitty-api`: API/resource-server client.

The custom `auth-service` remains present during migration but is deprecated for new login and registration flows.

## Current Product Boundary

The first baseline does not try to complete all domain modules. It establishes the authentication and authorization spine first:

- Anonymous users see a public entry point.
- Authenticated users see empty or real data states, not random dashboard data.
- Admin users can manage profile/subscription data.
- Admin users do not receive sensitive health measurements from the health service.

## Known Follow-Ups

- Synchronize or provision application user profile records from Keycloak registration events.
- Replace remaining mock/empty frontend sections with real API integrations.
- Expand body composition, measurements, goals, meals, nutrition plans and workout plans.
- Replace generic recommendation output with deterministic rule-based recommendations using real stored inputs.
- Add focused authorization and route-guard tests.
- Move local credentials to proper secret management before any non-local environment.
