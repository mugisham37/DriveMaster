# SLOs, Monitoring, and Security

SLOs
- Latency: p95 < 100ms for API
- Uptime: 99.99%

Observability
- OpenTelemetry traces/metrics; Prometheus scraping; Grafana dashboards
- Structured logging with correlation IDs

Security
- OAuth2/JWT, RBAC, input validation, rate limiting (Kong + app), encryption in transit, least-privileged access
- GDPR/CCPA workflows for data subject requests