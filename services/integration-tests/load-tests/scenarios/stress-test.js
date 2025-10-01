/**
 * Stress Test Scenario
 * Tests system breaking point and recovery under extreme load
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')
const throughput = new Counter('requests_total')

// Stress test configuration - pushing system to limits
export const options = {
  stages: [
    { duration: '2m', target: 1000 }, // Ramp up to 1K users
    { duration: '5m', target: 5000 }, // Ramp up to 5K users
    { duration: '10m', target: 10000 }, // Ramp up to 10K users
    { duration: '15m', target: 50000 }, // Stress test at 50K users
    { duration: '10m', target: 100000 }, // Peak stress at 100K users
    { duration: '5m', target: 50000 }, // Scale back down
    { duration: '5m', target: 0 }, // Recovery test
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Allow higher response times under stress
    http_req_failed: ['rate<0.05'], // Allow 5% error rate under extreme stress
    errors: ['rate<0.05'],
  },
}

const BASE_URL = __ENV.API_GATEWAY_URL || 'http://localhost:8000'

// Larger pool of test users for stress testing
const testUsers = Array.from({ length: 1000 }, (_, i) => ({
  email: `stresstest${i + 1}@drivemaster.com`,
  password: 'StressTest123!',
}))

export function setup() {
  console.log('Setting up stress test environment with 1000 test users...')

  // Create test users in batches to avoid overwhelming the system during setup
  const batchSize = 50
  for (let i = 0; i < testUsers.length; i += batchSize) {
    const batch = testUsers.slice(i, i + batchSize)

    batch.forEach((user) => {
      const response = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify(user), {
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.status !== 201 && response.status !== 409) {
        console.error(`Failed to create stress test user: ${response.status}`)
      }
    })

    sleep(0.1) // Small delay between batches
  }

  return { baseUrl: BASE_URL }
}

export default function (data) {
  throughput.add(1)

  const user = testUsers[Math.floor(Math.random() * testUsers.length)]

  // Simplified flow for stress testing - focus on core operations
  const loginResponse = http.post(`${data.baseUrl}/api/v1/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  })

  const loginSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time acceptable': (r) => r.timings.duration < 1000, // More lenient under stress
  })

  errorRate.add(!loginSuccess)
  responseTime.add(loginResponse.timings.duration)

  if (!loginSuccess) {
    sleep(Math.random() * 2) // Random backoff on failure
    return
  }

  const authToken = loginResponse.json('token')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  }

  // Test critical path operations under stress
  const operations = [
    () => http.get(`${data.baseUrl}/api/v1/profile`, { headers }),
    () => http.get(`${data.baseUrl}/api/v1/adaptive/recommendations`, { headers }),
    () => http.get(`${data.baseUrl}/api/v1/analytics/progress`, { headers }),
  ]

  // Randomly select operations to simulate varied user behavior
  const selectedOperations = operations.sort(() => 0.5 - Math.random()).slice(0, 2)

  selectedOperations.forEach((operation, index) => {
    const response = operation()

    const success = check(response, {
      [`operation ${index + 1} successful`]: (r) => r.status === 200,
      [`operation ${index + 1} response time acceptable`]: (r) => r.timings.duration < 2000,
    })

    errorRate.add(!success)
    responseTime.add(response.timings.duration)

    sleep(0.1) // Minimal delay between operations
  })

  // Shorter sleep times to maintain high load
  sleep(Math.random() * 1 + 0.5) // 0.5-1.5 seconds
}

export function teardown(data) {
  console.log('Stress test completed. System recovery metrics will be analyzed.')
}
