import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')
const requestCount = new Counter('requests')

// Test configuration for different scenarios
export const options = {
  scenarios: {
    // Smoke test - basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },

    // Load test - normal expected load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 }, // Ramp up to 100 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 200 }, // Ramp up to 200 users
        { duration: '5m', target: 200 }, // Stay at 200 users
        { duration: '2m', target: 0 }, // Ramp down
      ],
      tags: { test_type: 'load' },
    },

    // Stress test - beyond normal capacity
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 }, // Normal load
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 }, // Above normal load
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 }, // Stress load
        { duration: '5m', target: 300 },
        { duration: '2m', target: 400 }, // High stress
        { duration: '5m', target: 400 },
        { duration: '10m', target: 0 }, // Recovery
      ],
      tags: { test_type: 'stress' },
    },

    // Spike test - sudden traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // Normal load
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1400 }, // Spike to 1400 users
        { duration: '3m', target: 1400 }, // Stay at spike
        { duration: '10s', target: 100 }, // Quick ramp down
        { duration: '3m', target: 100 }, // Recovery
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
  },

  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests under 100ms
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    errors: ['rate<0.01'], // Custom error rate under 1%
    response_time: ['p(95)<100'], // Custom response time metric
    requests: ['count>1000'], // Minimum request count
  },
}

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'

// Authentication tokens for testing
const AUTH_TOKENS = {
  mobile: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-mobile-token',
  web: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-web-token',
}

// Test data
const TEST_DATA = {
  users: [
    { id: 'user-1', email: 'test1@example.com' },
    { id: 'user-2', email: 'test2@example.com' },
    { id: 'user-3', email: 'test3@example.com' },
  ],
  concepts: ['traffic-signs', 'road-rules', 'safety-procedures'],
  questions: ['q1', 'q2', 'q3', 'q4', 'q5'],
}

export function setup() {
  console.log('Starting DriveMaster Load Test')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Test scenarios: ${Object.keys(options.scenarios).join(', ')}`)

  // Warm up the system
  const warmupResponse = http.get(`${BASE_URL}/api/v1/user/health`)
  check(warmupResponse, {
    'warmup successful': (r) => r.status === 200,
  })

  return { startTime: new Date() }
}

export default function (data) {
  const testType = __ENV.TEST_TYPE || 'mixed'

  // Randomly select test scenario based on realistic usage patterns
  const scenarios = [
    { name: 'user_authentication', weight: 10 },
    { name: 'adaptive_learning', weight: 40 },
    { name: 'content_retrieval', weight: 30 },
    { name: 'analytics_tracking', weight: 15 },
    { name: 'social_features', weight: 5 },
  ]

  const scenario = selectWeightedScenario(scenarios)

  switch (scenario) {
    case 'user_authentication':
      testUserAuthentication()
      break
    case 'adaptive_learning':
      testAdaptiveLearning()
      break
    case 'content_retrieval':
      testContentRetrieval()
      break
    case 'analytics_tracking':
      testAnalyticsTracking()
      break
    case 'social_features':
      testSocialFeatures()
      break
  }

  // Random sleep between 1-3 seconds to simulate user behavior
  sleep(Math.random() * 2 + 1)
}

function testUserAuthentication() {
  const user = TEST_DATA.users[Math.floor(Math.random() * TEST_DATA.users.length)]

  // Login request
  const loginPayload = {
    email: user.email,
    password: 'test-password',
  }

  const loginResponse = http.post(
    `${BASE_URL}/api/v1/user/auth/login`,
    JSON.stringify(loginPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': generateRequestId(),
      },
    },
  )

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 100ms': (r) => r.timings.duration < 100,
    'login returns token': (r) => r.json('token') !== undefined,
  })

  requestCount.add(1)
  responseTime.add(loginResponse.timings.duration)
  errorRate.add(!loginSuccess)

  if (loginSuccess) {
    // Profile request with token
    const token = loginResponse.json('token')
    const profileResponse = http.get(`${BASE_URL}/api/v1/user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': generateRequestId(),
      },
    })

    const profileSuccess = check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile response time < 50ms': (r) => r.timings.duration < 50,
    })

    requestCount.add(1)
    responseTime.add(profileResponse.timings.duration)
    errorRate.add(!profileSuccess)
  }
}

function testAdaptiveLearning() {
  const user = TEST_DATA.users[Math.floor(Math.random() * TEST_DATA.users.length)]
  const concept = TEST_DATA.concepts[Math.floor(Math.random() * TEST_DATA.concepts.length)]

  // Get next question
  const questionResponse = http.get(
    `${BASE_URL}/api/v1/adaptive/next-question?userId=${user.id}&concept=${concept}`,
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKENS.mobile}`,
        'X-Request-ID': generateRequestId(),
      },
    },
  )

  const questionSuccess = check(questionResponse, {
    'question status is 200': (r) => r.status === 200,
    'question response time < 100ms': (r) => r.timings.duration < 100,
    'question has content': (r) => r.json('question') !== undefined,
  })

  requestCount.add(1)
  responseTime.add(questionResponse.timings.duration)
  errorRate.add(!questionSuccess)

  if (questionSuccess) {
    // Submit answer
    const answerPayload = {
      questionId: questionResponse.json('question.id'),
      answer: Math.random() > 0.3 ? 'correct' : 'incorrect', // 70% correct rate
      responseTime: Math.floor(Math.random() * 10000) + 2000, // 2-12 seconds
      confidence: Math.random(),
    }

    const answerResponse = http.post(
      `${BASE_URL}/api/v1/adaptive/submit-answer`,
      JSON.stringify(answerPayload),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.mobile}`,
          'X-Request-ID': generateRequestId(),
        },
      },
    )

    const answerSuccess = check(answerResponse, {
      'answer status is 200': (r) => r.status === 200,
      'answer response time < 150ms': (r) => r.timings.duration < 150,
    })

    requestCount.add(1)
    responseTime.add(answerResponse.timings.duration)
    errorRate.add(!answerSuccess)
  }
}

function testContentRetrieval() {
  const concept = TEST_DATA.concepts[Math.floor(Math.random() * TEST_DATA.concepts.length)]

  // Get content list
  const contentResponse = http.get(`${BASE_URL}/api/v1/content/list?category=${concept}&limit=20`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKENS.web}`,
      'X-Request-ID': generateRequestId(),
    },
  })

  const contentSuccess = check(contentResponse, {
    'content status is 200': (r) => r.status === 200,
    'content response time < 50ms': (r) => r.timings.duration < 50,
    'content has items': (r) => r.json('items') && r.json('items').length > 0,
    'content cached': (r) => r.headers['X-Cache-Status'] !== undefined,
  })

  requestCount.add(1)
  responseTime.add(contentResponse.timings.duration)
  errorRate.add(!contentSuccess)

  if (contentSuccess) {
    // Get specific content item
    const items = contentResponse.json('items')
    const randomItem = items[Math.floor(Math.random() * items.length)]

    const itemResponse = http.get(`${BASE_URL}/api/v1/content/item/${randomItem.id}`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKENS.web}`,
        'X-Request-ID': generateRequestId(),
      },
    })

    const itemSuccess = check(itemResponse, {
      'item status is 200': (r) => r.status === 200,
      'item response time < 30ms': (r) => r.timings.duration < 30,
    })

    requestCount.add(1)
    responseTime.add(itemResponse.timings.duration)
    errorRate.add(!itemSuccess)
  }
}

function testAnalyticsTracking() {
  const user = TEST_DATA.users[Math.floor(Math.random() * TEST_DATA.users.length)]

  // Track learning event
  const eventPayload = {
    userId: user.id,
    eventType: 'question_answered',
    contentId: TEST_DATA.questions[Math.floor(Math.random() * TEST_DATA.questions.length)],
    sessionId: generateSessionId(),
    responseData: {
      isCorrect: Math.random() > 0.3,
      responseTime: Math.floor(Math.random() * 10000) + 1000,
    },
    contextData: {
      deviceType: Math.random() > 0.5 ? 'mobile' : 'web',
      timestamp: new Date().toISOString(),
    },
  }

  const eventResponse = http.post(
    `${BASE_URL}/api/v1/analytics/track-event`,
    JSON.stringify(eventPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKENS.mobile}`,
        'X-Request-ID': generateRequestId(),
      },
    },
  )

  const eventSuccess = check(eventResponse, {
    'event status is 202': (r) => r.status === 202,
    'event response time < 50ms': (r) => r.timings.duration < 50,
  })

  requestCount.add(1)
  responseTime.add(eventResponse.timings.duration)
  errorRate.add(!eventSuccess)
}

function testSocialFeatures() {
  const user = TEST_DATA.users[Math.floor(Math.random() * TEST_DATA.users.length)]

  // Get leaderboard
  const leaderboardResponse = http.get(
    `${BASE_URL}/api/v1/engagement/leaderboard?userId=${user.id}&scope=friends`,
    {
      headers: {
        Authorization: `Bearer ${AUTH_TOKENS.mobile}`,
        'X-Request-ID': generateRequestId(),
      },
    },
  )

  const leaderboardSuccess = check(leaderboardResponse, {
    'leaderboard status is 200': (r) => r.status === 200,
    'leaderboard response time < 100ms': (r) => r.timings.duration < 100,
  })

  requestCount.add(1)
  responseTime.add(leaderboardResponse.timings.duration)
  errorRate.add(!leaderboardSuccess)
}

// Utility functions
function selectWeightedScenario(scenarios) {
  const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0)
  let random = Math.random() * totalWeight

  for (const scenario of scenarios) {
    random -= scenario.weight
    if (random <= 0) {
      return scenario.name
    }
  }

  return scenarios[0].name
}

function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function teardown(data) {
  const endTime = new Date()
  const duration = (endTime - data.startTime) / 1000
  console.log(`Load test completed in ${duration} seconds`)
}
