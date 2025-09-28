# System Architecture Overview

- Microservices (Fastify/TypeScript): user-svc, adaptive-svc, content-svc, analytics-svc, engagement-svc
- Shared packages: env validation, telemetry (OpenTelemetry), Kafka, Redis, Elasticsearch clients
- ML trainer (Python/FastAPI) for offline/nearline model training; online inference in Node via TF.js planned
- Data: PostgreSQL (service-owned schemas, JSONB for cognitive profile), Redis (cache/session/feature store), Elasticsearch (content/search), Kafka (events/streams)
- Edge/API: Kong gateway; Helm/K8s for deployment; Prom/Grafana/Otel for observability

Interactions
- REST for CRUD/low-latency operations; Kafka for events (learning events, notifications, analytics)
- Engagement via Socket.io (engagement-svc)