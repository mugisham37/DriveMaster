import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter, Gauge } from 'k6/metrics'
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js'
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js'

// Custom metrics for detailed performance tracking
const errorRate = new Rate('errors')
const responseTime = new Trend('response_time')
const requestCount = new Counter('requests')
const activeUsers = new Gauge('active_users')
const throughput = new Rate('throughput')

// Performance budgets and SLA thresholds
const PERFORMANCE_BUDGETS = {
  responseTime: {
    p50: 50, // 50ms
    p95: 100, // 100ms
    p99: 200, // 200ms
  },
  errorRate: 0.01, // 1%
  throughput: 100, // 100 RPS minimum
  availability: 0.999, // 99.9%
}

// Test configuration matrix
export const options = {
  scenarios: {
    // Smoke test - basic functionality validation
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },

    // Load test - normal expected traffic
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 }, // Ramp up
        { duration: '5m', target: 50 }, // Stay at normal load
        { duration: '2m', target: 100 }, // Increase load
        { duration: '5m', target: 100 }, // Stay at increased load
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
        { duration: '2m', target: 200 }, // Stress load
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 }, // High stress
        { duration: '5m', target: 300 },
        { duration: '2m', target: 400 }, // Breaking point
        { duration: '5m', target: 400 },
        { duration: '10m', target: 0 }, // Recovery
      ],
      tags: { test_type: 'stress' },
    },

    // Spike test - sudden traffic increases
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // Normal load
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 }, // Sudden spike
        { duration: '3m', target: 1000 }, // Maintain spike
        { duration: '10s', target: 100 }, // Quick recovery
        { duration: '3m', target: 100 }, // Normal load
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },

    // Volume test - large data processing
    volume_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      tags: { test_type: 'volume' },
    },

    // Endurance test - sustained load over time
    endurance_test: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30m',
      tags: { test_type: 'endurance' },
    },

    // Breakpoint test - find system limits
    breakpoint_test: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 1000,
      stages: [
        { duration: '2m', target: 100 }, // 100 RPS
        { duration: '2m', target: 200 }, // 200 RPS
        { duration: '2m', target: 300 }, // 300 RPS
        { duration: '2m', target: 400 }, // 400 RPS
        { duration: '2m', target: 500 }, // 500 RPS
        { duration: '2m', target: 600 }, // 600 RPS
        { duration: '2m', target: 700 }, // 700 RPS
        { duration: '2m', target: 800 }, // 800 RPS
        { duration: '2m', target: 900 }, // 900 RPS
        { duration: '2m', target: 1000 }, // 1000 RPS
      ],
      tags: { test_type: 'breakpoint' },
    },
  },

  // Global thresholds based on performance budgets
  thresholds: {
    http_req_duration: [
      `p(50)<${PERFORMANCE_BUDGETS.responseTime.p50}`,
      `p(95)<${PERFORMANCE_BUDGETS.responseTime.p95}`,
      `p(99)<${PERFORMANCE_BUDGETS.responseTime.p99}`,
    ],
    http_req_failed: [`rate<${PERFORMANCE_BUDGETS.errorRate}`],
    errors: [`rate<${PERFORMANCE_BUDGETS.errorRate}`],
    response_time: [
      `p(50)<${PERFORMANCE_BUDGETS.responseTime.p50}`,
      `p(95)<${PERFORMANCE_BUDGETS.responseTime.p95}`,
      `p(99)<${PERFORMANCE_BUDGETS.responseTime.p99}`,
    ],
    requests: ['count>100'],
    throughput: [`rate>${PERFORMANCE_BUDGETS.throughput}`],
  },
}

// Base configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'
const API_VERSION = __ENV.API_VERSION || 'v2'

// Authentication tokens for different user types
const AUTH_TOKENS = {
  student: generateJWT({ userId: 'student-1', role: 'student' }),
  instructor: generateJWT({ userId: 'instructor-1', role: 'instructor' }),
  admin: generateJWT({ userId: 'admin-1', role: 'admin' }),
}

// Test data sets
const TEST_DATA = {
  users: generateTestUsers(100),
  concepts: [
    'traffic-signs',
    'road-rules',
    'safety-procedures',
    'vehicle-operations',
    'situational-judgment',
  ],
  questions: generateTestQuestions(500),
  learningEvents: generateLearningEvents(1000),
}

export function setup() {
  console.log('🚀 Starting DriveMaster Performance Benchmark Suite')
  console.log(`📊 Base URL: ${BASE_URL}`)
  console.log(`🔧 API Version: ${API_VERSION}`)
  console.log(`👥 Test Users: ${TEST_DATA.users.length}`)
  console.log(`❓ Test Questions: ${TEST_DATA.questions.length}`)

  // System warm-up
  console.log('🔥 Warming up system...')
  const warmupRequests = [
    `${BASE_URL}/health`,
    `${BASE_URL}/api/${API_VERSION}/user/health`,
    `${BASE_URL}/api/${API_VERSION}/adaptive/health`,
    `${BASE_URL}/api/${API_VERSION}/content/health`,
    `${BASE_URL}/api/${API_VERSION}/analytics/health`,
    `${BASE_URL}/api/${API_VERSION}/engagement/health`,
  ]

  warmupRequests.forEach((url) => {
    const response = http.get(url)
    check(response, {
      'warmup successful': (r) => r.status === 200,
    })
  })

  console.log('✅ System warmed up successfully')

  return {
    startTime: new Date(),
    testData: TEST_DATA,
    authTokens: AUTH_TOKENS,
  }
}

export default function (data) {
  activeUsers.add(1)

  // Select test scenario based on current executor
  const testType = __ENV.TEST_TYPE || 'mixed'
  const scenario = selectTestScenario(testType)

  try {
    executeScenario(scenario, data)
  } catch (error) {
    console.error(`Scenario execution failed: ${error.message}`)
    errorRate.add(1)
  } finally {
    activeUsers.add(-1)
  }

  // Realistic user think time
  sleep(Math.random() * 3 + 1) // 1-4 seconds
}

function executeScenario(scenario, data) {
  switch (scenario) {
    case 'authentication_flow':
      testAuthenticationFlow(data)
      break
    case 'adaptive_learning_session':
      testAdaptiveLearningSession(data)
      break
    case 'content_browsing':
      testContentBrowsing(data)
      break
    case 'analytics_tracking':
      testAnalyticsTracking(data)
      break
    case 'social_interactions':
      testSocialInteractions(data)
      break
    case 'mixed_workload':
      testMixedWorkload(data)
      break
    case 'heavy_computation':
      testHeavyComputation(data)
      break
    case 'data_intensive':
      testDataIntensive(data)
      break
    default:
      testMixedWorkload(data)
  }
}

function testAuthenticationFlow(data) {
  const user = selectRandomUser(data.testData.users)

  // Login
  const loginResponse = performRequest(
    'POST',
    `/api/${API_VERSION}/user/auth/login`,
    {
      email: user.email,
      password: 'test-password',
    },
    null,
    'login',
  )

  if (loginResponse.status === 200) {
    const token = loginResponse.json('token')

    // Get profile
    performRequest('GET', `/api/${API_VERSION}/user/profile`, null, token, 'get_profile')

    // Update preferences
    performRequest(
      'PUT',
      `/api/${API_VERSION}/user/preferences`,
      {
        learningStyle: 'visual',
        difficultyPreference: 'adaptive',
        sessionLength: 30,
      },
      token,
      'update_preferences',
    )

    // Logout
    performRequest('POST', `/api/${API_VERSION}/user/auth/logout`, null, token, 'logout')
  }
}

function testAdaptiveLearningSession(data) {
  const user = selectRandomUser(data.testData.users)
  const token = data.authTokens.student
  const concept = selectRandomItem(data.testData.concepts)

  // Start learning session
  const sessionResponse = performRequest(
    'POST',
    `/api/${API_VERSION}/adaptive/session/start`,
    {
      userId: user.id,
      concept: concept,
      targetQuestions: 10,
    },
    token,
    'start_session',
  )

  if (sessionResponse.status === 200) {
    const sessionId = sessionResponse.json('sessionId')

    // Answer questions in the session
    for (let i = 0; i < 10; i++) {
      // Get next question
      const questionResponse = performRequest(
        'GET',
        `/api/${API_VERSION}/adaptive/next-question?sessionId=${sessionId}`,
        null,
        token,
        'get_question',
      )

      if (questionResponse.status === 200) {
        const question = questionResponse.json()

        // Submit answer (70% correct rate)
        const isCorrect = Math.random() > 0.3
        performRequest(
          'POST',
          `/api/${API_VERSION}/adaptive/submit-answer`,
          {
            sessionId: sessionId,
            questionId: question.id,
            answer: isCorrect ? question.correctAnswer : 'wrong-answer',
            responseTime: Math.floor(Math.random() * 15000) + 3000, // 3-18 seconds
            confidence: Math.random(),
          },
          token,
          'submit_answer',
        )
      }

      sleep(0.5) // Brief pause between questions
    }

    // End session
    performRequest(
      'POST',
      `/api/${API_VERSION}/adaptive/session/end`,
      {
        sessionId: sessionId,
      },
      token,
      'end_session',
    )
  }
}

function testContentBrowsing(data) {
  const token = data.authTokens.student
  const concept = selectRandomItem(data.testData.concepts)

  // Browse content categories
  performRequest('GET', `/api/${API_VERSION}/content/categories`, null, token, 'get_categories')

  // Get content list
  performRequest(
    'GET',
    `/api/${API_VERSION}/content/list?category=${concept}&limit=20`,
    null,
    token,
    'get_content_list',
  )

  // Get specific content items
  for (let i = 0; i < 3; i++) {
    const contentId = `content-${Math.floor(Math.random() * 100)}`
    performRequest(
      'GET',
      `/api/${API_VERSION}/content/item/${contentId}`,
      null,
      token,
      'get_content_item',
    )
  }

  // Search content
  performRequest(
    'GET',
    `/api/${API_VERSION}/content/search?q=traffic&limit=10`,
    null,
    token,
    'search_content',
  )
}

function testAnalyticsTracking(data) {
  const user = selectRandomUser(data.testData.users)
  const token = data.authTokens.student

  // Track multiple learning events
  const events = []
  for (let i = 0; i < 5; i++) {
    events.push({
      userId: user.id,
      eventType: selectRandomItem([
        'question_answered',
        'content_viewed',
        'session_started',
        'achievement_earned',
      ]),
      contentId: selectRandomItem(data.testData.questions).id,
      sessionId: `session-${Date.now()}-${Math.random()}`,
      responseData: {
        isCorrect: Math.random() > 0.3,
        responseTime: Math.floor(Math.random() * 10000) + 1000,
      },
      contextData: {
        deviceType: selectRandomItem(['mobile', 'web', 'tablet']),
        timestamp: new Date().toISOString(),
      },
    })
  }

  // Batch track events
  performRequest(
    'POST',
    `/api/${API_VERSION}/analytics/track-events`,
    {
      events: events,
    },
    token,
    'track_events',
  )

  // Get user analytics
  performRequest(
    'GET',
    `/api/${API_VERSION}/analytics/user/${user.id}/summary`,
    null,
    token,
    'get_user_analytics',
  )

  // Get performance metrics
  performRequest(
    'GET',
    `/api/${API_VERSION}/analytics/performance?timeRange=7d`,
    null,
    token,
    'get_performance_metrics',
  )
}

function testSocialInteractions(data) {
  const user = selectRandomUser(data.testData.users)
  const token = data.authTokens.student

  // Get leaderboard
  performRequest(
    'GET',
    `/api/${API_VERSION}/engagement/leaderboard?scope=friends&limit=10`,
    null,
    token,
    'get_leaderboard',
  )

  // Get achievements
  performRequest(
    'GET',
    `/api/${API_VERSION}/engagement/achievements/${user.id}`,
    null,
    token,
    'get_achievements',
  )

  // Share progress
  performRequest(
    'POST',
    `/api/${API_VERSION}/engagement/share-progress`,
    {
      userId: user.id,
      achievement: 'completed_traffic_signs',
      message: 'Just mastered traffic signs! 🚦',
    },
    token,
    'share_progress',
  )

  // Get notifications
  performRequest(
    'GET',
    `/api/${API_VERSION}/engagement/notifications?limit=20`,
    null,
    token,
    'get_notifications',
  )
}

function testMixedWorkload(data) {
  const scenarios = [
    { name: 'authentication_flow', weight: 10 },
    { name: 'adaptive_learning_session', weight: 40 },
    { name: 'content_browsing', weight: 25 },
    { name: 'analytics_tracking', weight: 15 },
    { name: 'social_interactions', weight: 10 },
  ]

  const selectedScenario = selectWeightedScenario(scenarios)
  executeScenario(selectedScenario, data)
}

function testHeavyComputation(data) {
  const user = selectRandomUser(data.testData.users)
  const token = data.authTokens.student

  // Complex ML predictions
  performRequest(
    'POST',
    `/api/${API_VERSION}/adaptive/predict-mastery`,
    {
      userId: user.id,
      concepts: data.testData.concepts,
      includeRecommendations: true,
    },
    token,
    'predict_mastery',
  )

  // Generate personalized learning path
  performRequest(
    'POST',
    `/api/${API_VERSION}/adaptive/generate-path`,
    {
      userId: user.id,
      targetConcepts: data.testData.concepts.slice(0, 3),
      timeConstraint: 30, // days
    },
    token,
    'generate_path',
  )

  // Complex analytics query
  performRequest(
    'GET',
    `/api/${API_VERSION}/analytics/advanced-insights?userId=${user.id}&depth=full`,
    null,
    token,
    'advanced_insights',
  )
}

function testDataIntensive(data) {
  const token = data.authTokens.admin

  // Bulk data operations
  performRequest(
    'GET',
    `/api/${API_VERSION}/analytics/export/learning-events?format=json&limit=1000`,
    null,
    token,
    'export_data',
  )

  // Large dataset queries
  performRequest(
    'GET',
    `/api/${API_VERSION}/content/bulk-search?q=*&limit=500`,
    null,
    token,
    'bulk_search',
  )

  // Aggregated reports
  performRequest(
    'GET',
    `/api/${API_VERSION}/analytics/reports/comprehensive?timeRange=30d`,
    null,
    token,
    'comprehensive_report',
  )
}

// Utility functions

function performRequest(method, url, payload, token, operation) {
  const startTime = Date.now()

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': generateRequestId(),
      'User-Agent': 'k6-performance-test/1.0',
    },
    tags: { operation: operation },
  }

  if (token) {
    params.headers['Authorization'] = `Bearer ${token}`
  }

  let response
  const fullUrl = `${BASE_URL}${url}`

  try {
    if (method === 'GET') {
      response = http.get(fullUrl, params)
    } else if (method === 'POST') {
      response = http.post(fullUrl, JSON.stringify(payload), params)
    } else if (method === 'PUT') {
      response = http.put(fullUrl, JSON.stringify(payload), params)
    } else if (method === 'DELETE') {
      response = http.del(fullUrl, null, params)
    }

    const duration = Date.now() - startTime

    // Record metrics
    requestCount.add(1)
    responseTime.add(duration)
    throughput.add(1)

    // Validate response
    const success = check(response, {
      [`${operation} status is success`]: (r) => r.status >= 200 && r.status < 400,
      [`${operation} response time < 5s`]: (r) => r.timings.duration < 5000,
      [`${operation} has valid response`]: (r) => r.body && r.body.length > 0,
    })

    if (!success) {
      errorRate.add(1)
      console.error(`Request failed: ${method} ${url} - Status: ${response.status}`)
    }

    // Check performance budgets
    if (duration > PERFORMANCE_BUDGETS.responseTime.p99) {
      console.warn(`Slow request detected: ${operation} took ${duration}ms`)
    }

    return response
  } catch (error) {
    errorRate.add(1)
    console.error(`Request error: ${method} ${url} - ${error.message}`)
    throw error
  }
}

function selectTestScenario(testType) {
  if (testType === 'mixed') {
    const scenarios = [
      'authentication_flow',
      'adaptive_learning_session',
      'content_browsing',
      'analytics_tracking',
      'social_interactions',
      'heavy_computation',
      'data_intensive',
    ]
    return selectRandomItem(scenarios)
  }
  return testType
}

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

function selectRandomUser(users) {
  return users[Math.floor(Math.random() * users.length)]
}

function selectRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function generateRequestId() {
  return `perf-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generateJWT(payload) {
  // Simplified JWT generation for testing
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 3600000 }))
  const signature = 'test-signature'
  return `${header}.${body}.${signature}`
}

function generateTestUsers(count) {
  const users = []
  for (let i = 1; i <= count; i++) {
    users.push({
      id: `user-${i}`,
      email: `test${i}@example.com`,
      role: i <= 80 ? 'student' : i <= 95 ? 'instructor' : 'admin',
    })
  }
  return users
}

function generateTestQuestions(count) {
  const questions = []
  for (let i = 1; i <= count; i++) {
    questions.push({
      id: `question-${i}`,
      concept: selectRandomItem(['traffic-signs', 'road-rules', 'safety-procedures']),
      difficulty: Math.random(),
      correctAnswer: 'A',
    })
  }
  return questions
}

function generateLearningEvents(count) {
  const events = []
  for (let i = 1; i <= count; i++) {
    events.push({
      id: `event-${i}`,
      userId: `user-${Math.floor(Math.random() * 100) + 1}`,
      eventType: selectRandomItem(['question_answered', 'content_viewed', 'session_started']),
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }
  return events
}

export function teardown(data) {
  const endTime = new Date()
  const duration = (endTime - data.startTime) / 1000

  console.log('📊 Performance Test Summary:')
  console.log(`⏱️  Total Duration: ${duration} seconds`)
  console.log(`📈 Total Requests: ${requestCount.count || 0}`)
  console.log(`⚡ Average RPS: ${((requestCount.count || 0) / duration).toFixed(2)}`)
  console.log(
    `❌ Error Rate: ${(((errorRate.count || 0) / (requestCount.count || 1)) * 100).toFixed(2)}%`,
  )

  // Performance budget validation
  console.log('\n🎯 Performance Budget Validation:')
  console.log(`✅ Response Time P95: Target <${PERFORMANCE_BUDGETS.responseTime.p95}ms`)
  console.log(`✅ Error Rate: Target <${PERFORMANCE_BUDGETS.errorRate * 100}%`)
  console.log(`✅ Throughput: Target >${PERFORMANCE_BUDGETS.throughput} RPS`)
}

export function handleSummary(data) {
  return {
    'performance-report.html': htmlReport(data),
    'performance-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}
