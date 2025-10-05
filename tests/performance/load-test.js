import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("error_rate");
const responseTime = new Trend("response_time");
const requestCount = new Counter("request_count");

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 10 }, // Ramp up to 10 users
    { duration: "5m", target: 10 }, // Stay at 10 users
    { duration: "2m", target: 50 }, // Ramp up to 50 users
    { duration: "5m", target: 50 }, // Stay at 50 users
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 100 }, // Stay at 100 users
    { duration: "2m", target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests should be below 1s
    http_req_failed: ["rate<0.05"], // Error rate should be below 5%
    error_rate: ["rate<0.05"],
    response_time: ["p(95)<1000"],
  },
};

// Base URLs
const BASE_URL = __ENV.BASE_URL || "http://localhost";
const AUTH_SERVICE_URL = `${BASE_URL}:3001`;
const USER_SERVICE_URL = `${BASE_URL}:8081`;
const CONTENT_SERVICE_URL = `${BASE_URL}:3002`;
const SCHEDULER_SERVICE_URL = `${BASE_URL}:8082`;
const ML_SERVICE_URL = `${BASE_URL}:8001`;
const EVENT_SERVICE_URL = `${BASE_URL}:8083`;

// Test data
const testUsers = [
  { id: "user1", email: "test1@example.com" },
  { id: "user2", email: "test2@example.com" },
  { id: "user3", email: "test3@example.com" },
  { id: "user4", email: "test4@example.com" },
  { id: "user5", email: "test5@example.com" },
];

const testItems = [
  { id: "item1", topic: "traffic-signs", difficulty: 0.3 },
  { id: "item2", topic: "traffic-rules", difficulty: 0.5 },
  { id: "item3", topic: "parking", difficulty: 0.7 },
  { id: "item4", topic: "emergency", difficulty: 0.4 },
  { id: "item5", topic: "highway", difficulty: 0.6 },
];

// Helper functions
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function getRandomItem() {
  return testItems[Math.floor(Math.random() * testItems.length)];
}

function makeRequest(url, method = "GET", payload = null, headers = {}) {
  const params = {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  let response;
  const startTime = Date.now();

  if (method === "GET") {
    response = http.get(url, params);
  } else if (method === "POST") {
    response = http.post(url, JSON.stringify(payload), params);
  } else if (method === "PUT") {
    response = http.put(url, JSON.stringify(payload), params);
  } else if (method === "DELETE") {
    response = http.del(url, null, params);
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Record metrics
  requestCount.add(1);
  responseTime.add(duration);
  errorRate.add(response.status >= 400);

  return response;
}

// Test scenarios
export function setup() {
  console.log("Setting up load test...");

  // Health check all services
  const services = [
    { name: "Auth Service", url: `${AUTH_SERVICE_URL}/health` },
    { name: "User Service", url: `${USER_SERVICE_URL}/health` },
    { name: "Content Service", url: `${CONTENT_SERVICE_URL}/health` },
    { name: "Scheduler Service", url: `${SCHEDULER_SERVICE_URL}/health` },
    { name: "ML Service", url: `${ML_SERVICE_URL}/health` },
    { name: "Event Service", url: `${EVENT_SERVICE_URL}/health` },
  ];

  for (const service of services) {
    const response = makeRequest(service.url);
    if (response.status !== 200) {
      console.error(`${service.name} is not healthy: ${response.status}`);
    } else {
      console.log(`${service.name} is healthy`);
    }
  }

  return { timestamp: new Date().toISOString() };
}

export default function (data) {
  const user = getRandomUser();
  const item = getRandomItem();

  // Simulate user workflow
  const scenario = Math.random();

  if (scenario < 0.3) {
    // Authentication flow (30%)
    testAuthenticationFlow(user);
  } else if (scenario < 0.6) {
    // Learning session flow (30%)
    testLearningSessionFlow(user, item);
  } else if (scenario < 0.8) {
    // Content browsing flow (20%)
    testContentBrowsingFlow(user);
  } else {
    // Progress tracking flow (20%)
    testProgressTrackingFlow(user);
  }

  sleep(1); // Think time between requests
}

function testAuthenticationFlow(user) {
  console.log(`Testing authentication flow for ${user.email}`);

  // 1. Health check
  let response = makeRequest(`${AUTH_SERVICE_URL}/health`);
  check(response, {
    "auth health check status is 200": (r) => r.status === 200,
  });

  // 2. Login attempt
  response = makeRequest(`${AUTH_SERVICE_URL}/api/v1/auth/login`, "POST", {
    email: user.email,
    password: "test_password",
  });

  check(response, {
    "login response status is 200 or 401": (r) =>
      r.status === 200 || r.status === 401,
    "login response time < 500ms": (r) => r.timings.duration < 500,
  });

  // 3. Token validation (if login successful)
  if (response.status === 200) {
    const loginData = JSON.parse(response.body);
    if (loginData.access_token) {
      response = makeRequest(
        `${AUTH_SERVICE_URL}/api/v1/auth/validate`,
        "POST",
        {
          token: loginData.access_token,
        }
      );

      check(response, {
        "token validation status is 200": (r) => r.status === 200,
        "token validation response time < 200ms": (r) =>
          r.timings.duration < 200,
      });
    }
  }
}

function testLearningSessionFlow(user, item) {
  console.log(`Testing learning session flow for ${user.id}`);

  // 1. Get next items from scheduler
  let response = makeRequest(
    `${SCHEDULER_SERVICE_URL}/api/v1/next-items`,
    "POST",
    {
      user_id: user.id,
      count: 5,
      session_type: "practice",
    }
  );

  check(response, {
    "scheduler next items status is 200": (r) => r.status === 200,
    "scheduler response time < 300ms": (r) => r.timings.duration < 300,
  });

  let nextItems = [];
  if (response.status === 200) {
    const schedulerData = JSON.parse(response.body);
    nextItems = schedulerData.items || [];
  }

  // 2. Submit attempt
  if (nextItems.length > 0) {
    const selectedItem = nextItems[0];
    response = makeRequest(
      `${EVENT_SERVICE_URL}/api/v1/events/attempt`,
      "POST",
      {
        user_id: user.id,
        item_id: selectedItem.id || item.id,
        session_id: `session_${user.id}_${Date.now()}`,
        selected: ["A"],
        correct: Math.random() > 0.3, // 70% correct rate
        time_taken_ms: Math.floor(Math.random() * 30000) + 5000, // 5-35 seconds
        quality: Math.floor(Math.random() * 6), // 0-5 quality score
      }
    );

    check(response, {
      "attempt submission status is 200 or 201": (r) =>
        r.status === 200 || r.status === 201,
      "attempt submission response time < 500ms": (r) =>
        r.timings.duration < 500,
    });
  }

  // 3. Get ML prediction
  response = makeRequest(`${ML_SERVICE_URL}/api/v1/predict`, "POST", {
    user_id: user.id,
    item_ids: [item.id],
    context: {
      session_type: "practice",
      recent_performance: 0.7,
    },
  });

  check(response, {
    "ML prediction status is 200": (r) => r.status === 200,
    "ML prediction response time < 1000ms": (r) => r.timings.duration < 1000,
  });
}

function testContentBrowsingFlow(user) {
  console.log(`Testing content browsing flow for ${user.id}`);

  // 1. Browse content
  let response = makeRequest(
    `${CONTENT_SERVICE_URL}/api/v1/content?limit=10&offset=0`
  );

  check(response, {
    "content browse status is 200": (r) => r.status === 200,
    "content browse response time < 500ms": (r) => r.timings.duration < 500,
  });

  // 2. Get specific content item
  response = makeRequest(
    `${CONTENT_SERVICE_URL}/api/v1/content/${getRandomItem().id}`
  );

  check(response, {
    "content item status is 200 or 404": (r) =>
      r.status === 200 || r.status === 404,
    "content item response time < 300ms": (r) => r.timings.duration < 300,
  });

  // 3. Search content
  response = makeRequest(
    `${CONTENT_SERVICE_URL}/api/v1/content/search?q=traffic&limit=5`
  );

  check(response, {
    "content search status is 200": (r) => r.status === 200,
    "content search response time < 800ms": (r) => r.timings.duration < 800,
  });
}

function testProgressTrackingFlow(user) {
  console.log(`Testing progress tracking flow for ${user.id}`);

  // 1. Get user progress
  let response = makeRequest(
    `${USER_SERVICE_URL}/api/v1/users/${user.id}/progress`
  );

  check(response, {
    "user progress status is 200 or 404": (r) =>
      r.status === 200 || r.status === 404,
    "user progress response time < 400ms": (r) => r.timings.duration < 400,
  });

  // 2. Get mastery levels
  response = makeRequest(`${USER_SERVICE_URL}/api/v1/users/${user.id}/mastery`);

  check(response, {
    "user mastery status is 200 or 404": (r) =>
      r.status === 200 || r.status === 404,
    "user mastery response time < 300ms": (r) => r.timings.duration < 300,
  });

  // 3. Get scheduler state
  response = makeRequest(
    `${SCHEDULER_SERVICE_URL}/api/v1/users/${user.id}/state`
  );

  check(response, {
    "scheduler state status is 200 or 404": (r) =>
      r.status === 200 || r.status === 404,
    "scheduler state response time < 200ms": (r) => r.timings.duration < 200,
  });
}

export function teardown(data) {
  console.log("Tearing down load test...");
  console.log(`Test started at: ${data.timestamp}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}

// Stress test scenario
export function stressTest() {
  const user = getRandomUser();

  // High-frequency requests to test system limits
  for (let i = 0; i < 10; i++) {
    const response = makeRequest(
      `${SCHEDULER_SERVICE_URL}/api/v1/next-items`,
      "POST",
      {
        user_id: user.id,
        count: 1,
      }
    );

    check(response, {
      "stress test response status < 500": (r) => r.status < 500,
    });

    sleep(0.1); // Very short sleep for stress testing
  }
}

// Spike test scenario
export function spikeTest() {
  const user = getRandomUser();

  // Sudden spike in requests
  const responses = [];
  for (let i = 0; i < 50; i++) {
    responses.push(makeRequest(`${AUTH_SERVICE_URL}/health`));
  }

  // Check that most requests succeeded
  const successCount = responses.filter((r) => r.status === 200).length;
  check(successCount, {
    "spike test success rate > 90%": (count) => count / responses.length > 0.9,
  });
}

// Volume test scenario
export function volumeTest() {
  const user = getRandomUser();

  // Large payload test
  const largePayload = {
    user_id: user.id,
    attempts: Array.from({ length: 100 }, (_, i) => ({
      item_id: `item_${i}`,
      correct: Math.random() > 0.5,
      time_taken_ms: Math.floor(Math.random() * 30000),
      timestamp: new Date().toISOString(),
    })),
  };

  const response = makeRequest(
    `${EVENT_SERVICE_URL}/api/v1/events/batch`,
    "POST",
    largePayload
  );

  check(response, {
    "volume test status is 200 or 413": (r) =>
      r.status === 200 || r.status === 413,
    "volume test response time < 5000ms": (r) => r.timings.duration < 5000,
  });
}
