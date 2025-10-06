# Integration Testing Suite

This directory contains comprehensive end-to-end integration tests for the Adaptive Learning Platform.

## Test Categories

### 1. User Journey Tests

- Complete user registration and onboarding flow
- Placement test administration and scoring
- Adaptive learning session execution
- Progress tracking and mastery calculations
- Cross-platform synchronization

### 2. Service Integration Tests

- Authentication service integration with all services
- Content service workflow (create → review → approve → publish)
- Scheduler service algorithm integration
- ML service prediction accuracy
- Event processing pipeline validation

### 3. Data Flow Tests

- Kafka event publishing and consumption
- Database consistency across services
- Redis caching behavior
- Offline/online synchronization

### 4. Performance Integration Tests

- End-to-end latency under load
- Concurrent user scenarios
- Resource utilization patterns
- Auto-scaling behavior

### 5. Chaos Engineering Tests

- Service failure scenarios
- Network partition handling
- Database failover testing
- Cache invalidation scenarios

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test category
npm run test:integration -- --grep "User Journey"

# Run with coverage
npm run test:integration:coverage

# Run chaos tests (requires special setup)
npm run test:chaos
```

## Test Environment Setup

Integration tests require:

- Docker Compose environment with all services
- Test database with sample data
- Kafka cluster for event testing
- Redis cluster for caching tests
- Mock external services (Auth0, S3, etc.)

## Test Data Management

- Test fixtures are generated programmatically
- Database is reset between test suites
- Kafka topics are cleaned up after tests
- Redis cache is flushed between tests
