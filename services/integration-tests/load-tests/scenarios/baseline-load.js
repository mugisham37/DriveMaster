/**
 * Baseline Load Test Scenario
 * Tests system performance under normal load conditions
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests must complete below 150ms
    http_req_failed: ['rate<0.01'], // Error rate must be below 1%
    errors: ['rate<0.01'],
  },
}

const BASE_URL = __ENV.API_GATEWAY_URL || 'http://localhost:8000'

// Test data
const testUsers = [
  { email: 'loadtest1@drivemaster.com', password: 'LoadTest123!' },
  { email: 'loadtest2@drivemaster.com', password: 'LoadTest123!' },
  { email: 'loadtest3@drivemaster.com', password: 'LoadTest123!' },
]

export function setup() {
  // Setup test users if needed
  console.log('Setting up load test environment...')

  // Create test users
  testUsers.forEach((user, index) => {
    const response = http.post(`${BASE_URL}/api/v1/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.status !== 201 && response.status !== 409) {
      // 409 = user already exists
      console.error(`Failed to create test user ${index + 1}: ${response.status}`)
    }
  })

  return { baseUrl: BASE_URL }
}

export default function (data) {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)]

  // Authentication
  const loginResponse = http.post(`${data.baseUrl}/api/v1/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  })

  const loginSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time < 100ms': (r) => r.timings.duration < 100,
  })

  errorRate.add(!loginSuccess)
  responseTime.add(loginResponse.timings.duration)

  if (!loginSuccess) {
    return
  }

  const authToken = loginResponse.json('token')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  }

  // User profile access
  const profileResponse = http.get(`${data.baseUrl}/api/v1/profile`, { headers })

  const profileSuccess = check(profileResponse, {
    'profile fetch successful': (r) => r.status === 200,
    'profile response time < 50ms': (r) => r.timings.duration < 50,
  })

  errorRate.add(!profileSuccess)
  responseTime.add(profileResponse.timings.duration)

  // Get learning recommendations
  const recommendationsResponse = http.get(`${data.baseUrl}/api/v1/adaptive/recommendations`, {
    headers,
  })

  const recommendationsSuccess = check(recommendationsResponse, {
    'recommendations fetch successful': (r) => r.status === 200,
    'recommendations response time < 100ms': (r) => r.timings.duration < 100,
  })

  errorRate.add(!recommendationsSuccess)
  responseTime.add(recommendationsResponse.timings.duration)

  // Start learning session
  const sessionResponse = http.post(
    `${data.baseUrl}/api/v1/adaptive/session/start`,
    JSON.stringify({
      category: 'traffic-signs',
      targetDuration: 1800000, // 30 minutes
    }),
    { headers },
  )

  const sessionSuccess = check(sessionResponse, {
    'session start successful': (r) => r.status === 201,
    'session start response time < 100ms': (r) => r.timings.duration < 100,
  })

  errorRate.add(!sessionSuccess)
  responseTime.add(sessionResponse.timings.duration)

  if (sessionSuccess) {
    const sessionId = sessionResponse.json('sessionId')

    // Simulate answering questions
    for (let i = 0; i < 3; i++) {
      // Get next question
      const questionResponse = http.get(
        `${data.baseUrl}/api/v1/adaptive/session/${sessionId}/next-question`,
        { headers },
      )

      const questionSuccess = check(questionResponse, {
        'question fetch successful': (r) => r.status === 200,
        'question response time < 100ms': (r) => r.timings.duration < 100,
      })

      errorRate.add(!questionSuccess)
      responseTime.add(questionResponse.timings.duration)

      if (questionSuccess) {
        const question = questionResponse.json('question')

        // Submit answer
        const answerResponse = http.post(
          `${data.baseUrl}/api/v1/adaptive/session/${sessionId}/answer`,
          JSON.stringify({
            questionId: question.id,
            answer: Math.floor(Math.random() * 4), // Random answer
            timeSpent: Math.floor(Math.random() * 30000) + 10000, // 10-40 seconds
            confidence: Math.floor(Math.random() * 5) + 1,
          }),
          { headers },
        )

        const answerSuccess = check(answerResponse, {
          'answer submission successful': (r) => r.status === 200,
          'answer response time < 100ms': (r) => r.timings.duration < 100,
        })

        errorRate.add(!answerSuccess)
        responseTime.add(answerResponse.timings.duration)
      }

      sleep(1) // 1 second between questions
    }

    // End session
    const endSessionResponse = http.post(
      `${data.baseUrl}/api/v1/adaptive/session/${sessionId}/end`,
      null,
      { headers },
    )

    const endSessionSuccess = check(endSessionResponse, {
      'session end successful': (r) => r.status === 200,
      'session end response time < 100ms': (r) => r.timings.duration < 100,
    })

    errorRate.add(!endSessionSuccess)
    responseTime.add(endSessionResponse.timings.duration)
  }

  // Get analytics
  const analyticsResponse = http.get(`${data.baseUrl}/api/v1/analytics/progress`, { headers })

  const analyticsSuccess = check(analyticsResponse, {
    'analytics fetch successful': (r) => r.status === 200,
    'analytics response time < 100ms': (r) => r.timings.duration < 100,
  })

  errorRate.add(!analyticsSuccess)
  responseTime.add(analyticsResponse.timings.duration)

  sleep(Math.random() * 3 + 1) // Random sleep between 1-4 seconds
}

export function teardown(data) {
  console.log('Cleaning up load test environment...')
  // Cleanup logic if needed
}
