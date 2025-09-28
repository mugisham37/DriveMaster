# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Monorepo managed by pnpm workspaces with these top-level areas:
  - packages/*: shared libraries (env config via Zod, telemetry/OpenTelemetry, KafkaJS client, Redis client, Elasticsearch client)
  - services/*: Fastify + TypeScript microservices (user-svc, adaptive-svc, content-svc, analytics-svc, engagement-svc)
  - apps/mobile: React Native (Expo) client
  - training/ml-trainer: Python FastAPI app for model training/experiments
- Data & infra: PostgreSQL (Prisma in service-owning schemas), Redis (cache/session), Elasticsearch (content + search), Kafka (events/streams), Kong (gateway), Helm charts for K8s, Prometheus/Grafana + OpenTelemetry.

Environment & prerequisites
- Node >= 20 and pnpm 9 (see package.json engines and packageManager)
- Service configuration comes from per-service .env files. As a baseline, see services/user-svc/.env.example (PORT, POSTGRES_URL, REDIS_URL, KAFKA_BROKERS, ELASTICSEARCH_URL, JWT_SECRET). Other services follow the same pattern.

Common commands
- Install workspace dependencies
  - pnpm install -w
- Build all backend services
  - pnpm -r --filter ./services/* run build
- Typecheck and lint across the repo
  - pnpm typecheck
  - pnpm lint
- Run all tests across the repo
  - pnpm test
- Run a single package’s tests (example: user-svc)
  - pnpm -C services/user-svc test
  - With a name pattern: pnpm -C services/user-svc test -- -t "pattern"
  - Single file: pnpm -C services/user-svc test -- path/to/file.test.ts
- Start a service in dev mode (Hot-reload via tsx)
  - pnpm -C services/user-svc dev
  - Replace the path with any service under services/* (e.g., content-svc, adaptive-svc, analytics-svc, engagement-svc)
- Prisma (services using Prisma: user-svc, content-svc, adaptive-svc)
  - Generate client: pnpm -C services/<svc> run prisma:generate
  - Dev migrate: pnpm -C services/<svc> run prisma:migrate:dev
- Mobile app (Expo)
  - pnpm -C apps/mobile start
  - pnpm -C apps/mobile android
  - pnpm -C apps/mobile ios
- Python trainer (FastAPI)
  - cd training/ml-trainer
  - python -m venv .venv && .venv\Scripts\Activate.ps1 (Windows PowerShell)
  - pip install -r requirements.txt
  - uvicorn main:app --reload

Service defaults and ports
- user-svc: default PORT 3001 (see services/user-svc/.env.example)
- adaptive-svc: 3002; content-svc: 3003; analytics-svc: 3004; engagement-svc: 3005 (override via PORT)

High-level architecture and flow
- Request/Response
  - Kong gateway fronts public APIs and routes to Fastify services.
  - Each service owns its data (PostgreSQL via Prisma). Shared concerns live in packages/*.
- Async/Eventing
  - Kafka used for domain events and analytics pipelines. Draft topics (docs/KAFKA_TOPICS.md):
    - learning.events.v1 (answers, response time, confidence)
    - recommendations.requests.v1 (context for next item)
    - recommendations.decisions.v1 (chosen item + features)
    - notifications.events.v1 (engagement)
    - analytics.aggregates.v1 (precomputed metrics)
- Adaptivity
  - adaptive-svc orchestrates algorithms (docs/ALGORITHMS.md): BKT, Thompson Sampling bandits, Spaced Repetition, and IRT calibration. Online decisions in Node; offline/nearline training in training/ml-trainer.
- Search & Content
  - content-svc manages content, schemas, and Elasticsearch indexing; analytics-svc exposes Prometheus metrics; engagement-svc handles Socket.io with Redis adapter for multi-instance broadcasts.
- Observability & ops
  - OpenTelemetry in services; Prometheus scraping and Grafana dashboards (docs/OPS.md). CI via GitHub Actions runs install, lint, typecheck, and service builds on pushes/PRs to main.

CI reference (GitHub Actions)
- On main pushes/PRs the workflow performs:
  - pnpm install -w
  - pnpm lint
  - pnpm typecheck
  - pnpm -r --filter ./services/* run build

Notes for agents operating in this repo
- Prefer targeting individual packages/services with pnpm -C <path> to run dev, test, lint, or Prisma tasks.
- Use workspace scripts for repo-wide ops (build, lint, typecheck, test).
