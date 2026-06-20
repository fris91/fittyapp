# --- Build stage: compile the SPA to static assets ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Build-time VITE_* are optional; runtime config (env-config.js) takes precedence at container start.
RUN npm run build

# --- Runtime stage: serve static assets with nginx + runtime config injection ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# nginx runs every executable in /docker-entrypoint.d/ before starting; this writes env-config.js.
COPY docker-entrypoint.sh /docker-entrypoint.d/40-fitty-env-config.sh
RUN chmod +x /docker-entrypoint.d/40-fitty-env-config.sh
EXPOSE 3000
