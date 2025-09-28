# Adaptive Algorithms Plan

Bayesian Knowledge Tracing (BKT)
- 4-parameter model (P(L0), P(T), P(G), P(S)) with temporal decay and response-time/confidence features
- Concept graph with prerequisites influences

Multi-Armed Bandit (MAB)
- Thompson Sampling over contextual features: knowledge state vector, time-of-day, session goals, fatigue
- Keep success rate in 70–85% band (ZPD)

Spaced Repetition
- SM-2 enhanced with individual forgetting curves, interference modeling, review load balancing

Item Response Theory (IRT)
- Calibrate items with discrimination, difficulty, guessing parameters

Pipelines
- Online inference in adaptive-svc; stream features/events via Kafka for analytics/training