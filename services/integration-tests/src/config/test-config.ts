/**
 * Test Configuration for Integration Tests
 * Centralized configuration for all test scenarios
 */

export const TEST_CONFIG = {
  // Service Endpoints
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    adaptiveService: process.env.ADAPTIVE_SERVICE_URL || 'http://localhost:3002',
    contentService: process.env.CONTENT_SERVICE_URL || 'http://localhost:3003',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004',
    engagementService: process.env.ENGAGEMENT_SERVICE_URL || 'http://localhost:3005',
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:8000',
  },

  // Test Data
  testUsers: {
    validUser: {
      email: 'test@drivemaster.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
    },
    adminUser: {
      email: 'admin@drivemaster.com',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
    },
  },

  // Performance Thresholds
  performance: {
    maxResponseTime: 100, // milliseconds
    maxP95ResponseTime: 150,
    minThroughput: 1000, // requests per second
    maxErrorRate: 0.01, // 1%
    targetUptime: 0.9999, // 99.99%
  },

  // Load Testing
  loadTest: {
    virtualUsers: 1000,
    duration: '5m',
    rampUpTime: '30s',
    scenarios: {
      light: { users: 100, duration: '2m' },
      moderate: { users: 1000, duration: '5m' },
      heavy: { users: 10000, duration: '10m' },
      stress: { users: 50000, duration: '15m' },
      spike: { users: 100000, duration: '1m' },
    },
  },

  // Timeouts
  timeouts: {
    default: 5000,
    database: 3000,
    cache: 1000,
    external: 10000,
  },

  // Retry Configuration
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 2,
  },
} as const

export type TestConfig = typeof TEST_CONFIG
