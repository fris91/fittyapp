# Fitty Web

React + Vite web app for Fitty.

```bash
npm install
npm run dev
```

For the local Kubernetes cluster:

```bash
VITE_API_BASE_URL=http://192.168.1.192:30080
VITE_KEYCLOAK_URL=http://192.168.1.192:30081
VITE_KEYCLOAK_REALM=fitty
VITE_KEYCLOAK_CLIENT_ID=fitty-web
```

Anonymous visitors see a public landing page only. Authenticated users are routed by Keycloak realm role:

- `FITTY_USER`: personal wellness workspace.
- `FITTY_ADMIN`: admin users workspace plus protected app sections.

The UI Kit is no longer part of product navigation. Theme switching is exposed as a simple light/dark toggle.
