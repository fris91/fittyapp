# Fitty

Fitty is a local-first wellness and fitness starter platform built with Spring Boot microservices, Kafka, PostgreSQL, MongoDB, React, and Expo.

## Local Runtime

Prerequisites:

- Docker Desktop
- Java 17+ for local service development
- Node.js 20+ for web/mobile development outside Docker

Start the full local stack:

```bash
docker compose up --build
```

Useful endpoints:

- Web app: http://localhost:3000
- API Gateway: http://localhost:8080
- Kafka UI: http://localhost:8090
- Eureka, optional legacy discovery: http://localhost:8761
- Config Server, optional legacy config: http://localhost:8888

## Architecture

Web and mobile clients only call the API Gateway. The gateway routes REST traffic to backend services and validates JWTs for protected routes. Services persist their own data and publish JSON domain events to Kafka for asynchronous side effects.

PostgreSQL is used for relational account/profile data. MongoDB is used for health snapshots, recommendations, notifications, and starter nutrition data because these records are document-like and evolve quickly.

See [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md).

## Commands

```bash
make up
make down
make logs
make test
make clean
```

## Core Topics

- `user-registered`
- `user-profile-updated`
- `health-data-ingested`
- `health-risk-detected`
- `recommendation-ready`
- `nutrition-plan-updated`
- `notification-created`

Kafka auto-creates topics in the local starter. In production, create topics explicitly with retention, partitions, retry, and DLQ policies.

## Authentication

`auth-service` supports local email/password registration and login with BCrypt password hashing and JWT access/refresh tokens. Google and Facebook OAuth2 endpoints are placeholders for provider wiring.

Default local JWT values live in `.env.example`. Replace them before any shared or production deployment.

## OpenAPI

Each Spring service includes Springdoc OpenAPI. Swagger UI paths follow:

- `http://localhost:8081/swagger-ui.html`
- `http://localhost:8082/swagger-ui.html`
- `http://localhost:8083/swagger-ui.html`
- `http://localhost:8084/swagger-ui.html`
- `http://localhost:8085/swagger-ui.html`
- `http://localhost:8086/swagger-ui.html`

## Known Limitations

- Recommendation logic is intentionally rule-based for the first local version.
- OAuth2 providers are placeholders.
- Redis is documented as an optional future profile but not enabled by default.
- Kubernetes, Helm, Spinnaker, and cloud deployment files are intentionally excluded from this Docker Compose version.
