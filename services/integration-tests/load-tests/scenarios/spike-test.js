/**
 * Spike Test Scenario
 * Tests system behavior under sudden traffic spikes
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')
const throughput = new Counter('requests_total')

// Spike test configuration - sudden traffic bursts
export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Normal load
    { duration: '30s', target: 10000 }, // Sudden spike to 10K users
    { duration: '2m', target: 10000 }, // Maintain spike
    { duration: '30s', target: 100 }, // Drop back to normal
    { duration: '1m', target: 100 }, // Maintain normal
    { duration: '30s', target: 50000 }, // Massive spike to 50K users
    { duration: '1m', target: 50000 }, // Maintain massive spike
    { duration: '30s', target: 0 }, // Complete drop
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Allow higher response times during spikes
    http_req_failed: ['rate<0.1'], // Allow 10% error rate during spikes
    errors: ['rate<0.1'],
  },
}

const BASE_URL = __ENV.API_GATEWAY_URL || 'http://localhost:8000'

// Test users for spike testing
const testUsers = Array.from({ length: 500 }, (_, i) => ({
  email: `spiketest${i + 1}@drivemaster.com`,
  password: 'SpikeTest123!',
}))

export function setup() {
  console.log('Setting up spike test environment...')

  // Quick setup for spike testing
  testUsers.slice(0, 100).forEach((user) => {
    const response = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status !== 201 && response.status !== 409) {
      console.error(`Failed to create spike test user: ${response.status}`)
    }
  })

  return { baseUrl: BASE_URL }
}

export default function (data) {
  throughput.add(1)

  const user = testUsers[Math.floor(Math.random() * Math.min(testUsers.length, 100))]

  // Minimal operations for spike testing - focus on system stability
  const loginResponse = http.post(`${data.baseUrl}/api/v1/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  })

  const loginSuccess = check(loginResponse, {
    'login during spike': (r) => r.status === 200 || r.status === 429, // Accept rate limiting
    'login response time during spike': (r) => r.timings.duration < 5000, // Very lenient during spikes
  })

  errorRate.add(!loginSuccess && loginResponse.status !== 429) // Don't count rate limits as errors
  responseTime.add(loginResponse.timings.duration)

  if (loginResponse.status === 200) {
    const authToken = loginResponse.json('token')
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    }

    // Single critical operation during spike
    const healthResponse = http.get(`${data.baseUrl}/api/v1/health`, { headers })

    const healthSuccess = check(healthResponse, {
      'health check during spike': (r) => r.status === 200 || r.status === 503, // Accept service unavailable
      'health response time during spike': (r) => r.timings.duration < 10000,
    })

    errorRate.add(!healthSuccess && healthResponse.status !== 503)
    responseTime.add(healthResponse.timings.duration)
  }

  // No sleep during spike test - maximum pressure
}

export function teardown(data) {
  console.log('Spike test completed. Analyzing system recovery and circuit breaker behavior.')
}
