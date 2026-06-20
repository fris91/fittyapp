#!/bin/sh
# Regenerates the runtime config consumed by the SPA from environment variables.
# Runs via nginx's /docker-entrypoint.d/ hook before nginx starts, so a single image
# works across environments without rebuilding. Keep keys in sync with main.tsx readConfig().
set -eu

CONFIG_FILE="/usr/share/nginx/html/env-config.js"

cat > "$CONFIG_FILE" <<EOF
window.__FITTY_ENV__ = {
  "VITE_API_BASE_URL": "${VITE_API_BASE_URL:-}",
  "VITE_KEYCLOAK_URL": "${VITE_KEYCLOAK_URL:-}",
  "VITE_KEYCLOAK_REALM": "${VITE_KEYCLOAK_REALM:-fitty}",
  "VITE_KEYCLOAK_CLIENT_ID": "${VITE_KEYCLOAK_CLIENT_ID:-fitty-web}"
};
EOF

echo "fitty: wrote runtime config to $CONFIG_FILE"
