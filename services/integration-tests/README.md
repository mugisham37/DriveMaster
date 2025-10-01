# Integration Tests

Comprehensive integration and end-to-end testing suite for the DriveMaster platform.

## Overview

This test suite validates:

- **Service Integration** - Microservice interactions and API contracts
- **End-to-End Flows** - Complete user journeys from registration to learning
- **Load Testing** - Performance under various load conditions
- **Chaos Engineering** - System resilience under failure conditions
- **Security Validation** - Authentication, authorization, and input validation

## Test Structure

```
src/
├── config/
│   └── test-config.ts          # Test configuration and constants
├── utils/
│   └── test-helpers.ts         # Common utilities and test clients
├── integration-tests/
│   └── service-integration.test.ts  # Service interaction tests
├── e2e-tests/
│   └── user-learning-flow.test.ts   # Complete user journey tests
├── chaos-tests/
│   └── resilience.test.ts      # System resilience tests
└── security-tests/
    └── security-validation.test.ts  # Security and compliance tests
```

## Running Tests

### Prerequisites

1. **Services Running**: All microservices must be running and accessible
2. **Test Data**: Test users and content should be seeded
3. **Environment Variables**: Configure test endpoints

```bash
export USER_SERVICE_URL=http://localhost:3001
export ADAPTIVE_SERVICE_URL=http://localhost:3002
export CONTENT_SERVICE_URL=http://localhost:3003
export ANALYTICS_SERVICE_URL=http://localhost:3004
export ENGAGEMENT_SERVICE_URL=http://localhost:3005
export API_GATEWAY_URL=http://localhost:8000
```

### Test Commands

```bash
# Install dependencies
pnpm install

# Run all integration tests
pnpm test:integration

# Run end-to-end tests
pnpm test:e2e

# Run security tests
pnpm test:security

# Run chaos engineering tests
pnpm test:chaos

# Run all tests
pnpm test:all

# Run load tests
pnpm test:load
```

### Load Testing with K6

```bash
# Install K6
# macOS: brew install k6
# Windows: choco install k6
# Linux: sudo apt-get install k6

# Run baseline load test
k6 run load-tests/scenarios/baseline-load.js

# Run stress test
k6 run load-tests/scenarios/stress-test.js

# Run spike test
k6 run load-tests/scenarios/spike-test.js
```

## Test Configuration

### Environment Variables

| Variable                 | Description                        | Default                 |
| ------------------------ | ---------------------------------- | ----------------------- |
| `USER_SERVICE_URL`       | User service endpoint              | `http://localhost:3001` |
| `ADAPTIVE_SERVICE_URL`   | Adaptive learning service endpoint | `http://localhost:3002` |
| `CONTENT_SERVICE_URL`    | Content service endpoint           | `http://localhost:3003` |
| `ANALYTICS_SERVICE_URL`  | Analytics service endpoint         | `http://localhost:3004` |
| `ENGAGEMENT_SERVICE_URL` | Engagement service endpoint        | `http://localhost:3005` |
| `API_GATEWAY_URL`        | API Gateway endpoint               | `http://localhost:8000` |

### Performance Thresholds

- **Response Time**: P95 < 150ms
- **Error Rate**: < 1%
- **Throughput**: > 1000 RPS
- **Uptime**: > 99.99%

## Test Scenarios

### Integration Tests

1. **Service Health Checks** - Validate all services are healthy
2. **Authentication Flow** - User registration and login
3. **Cross-Service Communication** - Service-to-service interactions
4. **Error Handling** - Circuit breakers and fallback mechanisms
5. **Performance Validation** - Response time and throughput requirements

### End-to-End Tests

1. **User Registration and Onboarding** - Complete signup flow
2. **Initial Assessment** - Adaptive learning assessment
3. **Learning Session** - Question answering and progress tracking
4. **Analytics and Insights** - Progress tracking and recommendations
5. **Gamification** - Achievements and leaderboards
6. **Spaced Repetition** - Review scheduling and optimization

### Load Tests

1. **Baseline Load** - Normal usage patterns (100-200 users)
2. **Moderate Load** - Peak usage (1,000 users)
3. **Heavy Load** - High traffic (10,000 users)
4. **Stress Test** - Breaking point (50,000+ users)
5. **Spike Test** - Sudden traffic spikes

### Chaos Tests

1. **Service Failures** - Individual service outages
2. **Database Issues** - Connection failures and timeouts
3. **Network Partitions** - Network connectivity issues
4. **Resource Exhaustion** - Memory and CPU pressure
5. **Data Consistency** - Concurrent modification handling

### Security Tests

1. **Authentication** - Token validation and expiration
2. **Authorization** - Role-based access control
3. **Input Validation** - XSS and injection prevention
4. **Rate Limiting** - DoS protection
5. **Data Privacy** - GDPR compliance validation

## Continuous Integration

### GitHub Actions Integration

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm test:integration
      - run: pnpm test:e2e
      - run: pnpm test:security
```

### Test Reports

Test results are generated in multiple formats:

- **JSON**: Machine-readable results for CI/CD
- **JUnit XML**: Integration with test reporting tools
- **HTML Coverage**: Visual coverage reports
- **Performance Metrics**: Response time and throughput data

## Troubleshooting

### Common Issues

1. **Service Unavailable**
   - Check if all services are running
   - Verify network connectivity
   - Check service health endpoints

2. **Authentication Failures**
   - Verify test user credentials
   - Check JWT token expiration
   - Validate service configuration

3. **Timeout Errors**
   - Increase test timeouts
   - Check service performance
   - Verify database connectivity

4. **Load Test Failures**
   - Check system resources
   - Verify scaling configuration
   - Monitor error rates

### Debug Mode

Enable debug logging:

```bash
export DEBUG=drivemaster:*
export LOG_LEVEL=debug
pnpm test:integration
```

### Test Data Cleanup

Clean up test data after runs:

```bash
# Manual cleanup
curl -X DELETE http://localhost:3001/test/cleanup

# Automatic cleanup (enabled by default)
export AUTO_CLEANUP=true
```

## Contributing

### Adding New Tests

1. **Create Test File**: Follow naming convention `*.test.ts`
2. **Use Test Helpers**: Leverage existing utilities
3. **Add Configuration**: Update test config if needed
4. **Document Scenarios**: Add test descriptions
5. **Update CI/CD**: Include in automation pipeline

### Test Guidelines

- **Isolation**: Tests should be independent
- **Cleanup**: Clean up test data
- **Assertions**: Use descriptive assertions
- **Performance**: Include performance validations
- **Documentation**: Document test scenarios

---

**Last Updated**: 2025-01-01  
**Maintainer**: Integration Testing Team
