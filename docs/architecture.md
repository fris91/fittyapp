# Fitty Architecture

## Component Diagram

```mermaid
flowchart LR
  Web["Web App"] --> Gateway["API Gateway / BFF"]
  Mobile["Mobile App"] --> Gateway
  Gateway --> Auth["Auth Service"]
  Gateway --> User["User Service"]
  Gateway --> Health["Health Data Service"]
  Gateway --> Reco["Recommendation Service"]
  Gateway --> Meal["Meal Service"]
  Gateway --> Notify["Notification Service"]
  Auth --> Postgres["PostgreSQL"]
  User --> Mongo["MongoDB"]
  Health --> Mongo
  Reco --> Mongo
  Meal --> Postgres
  Notify --> Mongo
  Auth --> Kafka["Kafka"]
  User --> Kafka
  Health --> Kafka
  Meal --> Kafka
  Kafka --> Reco
  Kafka --> Notify
  Providers["Google Fit / Health Connect / Xiaomi placeholders"] --> Health
```

## Manual Health Data Ingestion

```mermaid
sequenceDiagram
  participant C as Client
  participant G as API Gateway
  participant H as HealthDataService
  participant M as MongoDB
  participant K as Kafka
  participant R as RecommendationService
  participant N as NotificationService

  C->>G: POST /api/v1/health-data
  G->>H: Forward with user context
  H->>M: Save health snapshot
  H->>K: Publish health-data-ingested
  K-->>R: Consume health-data-ingested
  R->>R: Apply local rule engine
  R->>M: Save recommendation
  R->>K: Publish recommendation-ready
  K-->>N: Consume recommendation-ready
  N->>M: Save notification
```

## Login

```mermaid
sequenceDiagram
  participant C as Client
  participant G as API Gateway
  participant A as AuthService
  participant P as PostgreSQL

  C->>G: POST /api/v1/auth/login
  G->>A: Forward credentials
  A->>P: Load account
  A->>A: Verify BCrypt password
  A-->>G: JWT access and refresh token
  G-->>C: Token response
```

## Event Reliability Notes

The local starter uses JSON events and Kafka auto topic creation. Production should add explicit schemas, retry topics, DLQ topics, idempotency keys, consumer offsets monitored through alerts, and versioned event contracts.
