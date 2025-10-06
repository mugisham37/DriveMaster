// K6 Load Testing Script for Adaptive Learning Platform
// This script tests various performance scenarios and identifies bottlenecks

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const requestCount = new Counter("requests");

// Configuration
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const API_KEY = __ENV.API_KEY || "test-api-key";

// Test scenarios
export const options = {
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: "constant-vus",
      vus: 50,
      duration: "5m",
      tags: { test_type: "baseline" },
    },

    // Spike test
    spike_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 100 },
        { duration: "1m", target: 500 }, // Spike
        { duration: "2m", target: 100 },
        { duration: "1m", target: 0 },
      ],
      tags: { test_type: "spike" },
    },

    // Stress test
    stress_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5m", target: 100 },
        { duration: "10m", target: 200 },
        { duration: "5m", target: 300 },
        { duration: "10m", target: 400 },
        { duration: "5m", target: 0 },
      ],
      tags: { test_type: "stress" },
    },

    // Soak test (long duration)
    soak_test: {
      executor: "constant-vus",
      vus: 100,
      duration: "30m",
      tags: { test_type: "soak" },
    },
  },

  thresholds: {
    // Performance requirements
    http_req_duration: ["p(95)<300"], // 95% of requests under 300ms
    http_req_failed: ["rate<0.01"], // Error rate under 1%

    // Custom thresholds
    response_time: ["p(95)<300"],
    errors: ["rate<0.01"],
  },
};

// Test data
const testUsers = [
  { id: "user1", email: "test1@example.com" },
  { id: "user2", email: "test2@example.com" },
  { id: "user3", email: "test3@example.com" },
];

const testItems = ["item-1", "item-2", "item-3", "item-4", "item-5"];

// Authentication helper
function authenticate() {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    {
      email: "test@example.com",
      password: "testpassword123",
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (response.status === 200) {
    const body = JSON.parse(response.body);
    return body.token;
  }
  return null;
}

// Main test function
export default function () {
  const token = authenticate();
  if (!token) {
    errorRate.add(1);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Test different endpoints
  testNextItemSelection(headers);
  testAttemptSubmission(headers);
  testUserProgress(headers);
  testContentRetrieval(headers);

  sleep(1);
}

// Test next item selection (critical path)
function testNextItemSelection(headers) {
  const startTime = Date.now();

  const response = http.get(`${BASE_URL}/api/scheduler/next-items?count=5`, {
    headers: headers,
  });

  const duration = Date.now() - startTime;
  responseTime.add(duration);
  requestCount.add(1);

  const success = check(response, {
    "next items status is 200": (r) => r.status === 200,
    "next items response time < 300ms": () => duration < 300,
    "next items returns valid data": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items) && body.items.length > 0;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }
}

// Test attempt submission
function testAttemptSubmission(headers) {
  const startTime = Date.now();

  const attemptData = {
    itemId: testItems[Math.floor(Math.random() * testItems.length)],
    selected: ["A"],
    correct: Math.random() > 0.3, // 70% correct rate
    timeTaken: Math.floor(Math.random() * 30000) + 5000, // 5-35 seconds
    quality: Math.floor(Math.random() * 6), // 0-5 quality score
  };

  const response = http.post(
    `${BASE_URL}/api/scheduler/attempts`,
    JSON.stringify(attemptData),
    {
      headers: headers,
    }
  );

  const duration = Date.now() - startTime;
  responseTime.add(duration);
  requestCount.add(1);

  const success = check(response, {
    "attempt submission status is 200": (r) => r.status === 200,
    "attempt submission response time < 500ms": () => duration < 500,
    "attempt submission returns valid response": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }
}

// Test user progress retrieval
function testUserProgress(headers) {
  const startTime = Date.now();

  const response = http.get(`${BASE_URL}/api/users/progress`, {
    headers: headers,
  });

  const duration = Date.now() - startTime;
  responseTime.add(duration);
  requestCount.add(1);

  const success = check(response, {
    "user progress status is 200": (r) => r.status === 200,
    "user progress response time < 200ms": () => duration < 200,
    "user progress returns valid data": (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.mastery === "object";
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }
}

// Test content retrieval
function testContentRetrieval(headers) {
  const startTime = Date.now();

  const itemId = testItems[Math.floor(Math.random() * testItems.length)];
  const response = http.get(`${BASE_URL}/api/content/items/${itemId}`, {
    headers: headers,
  });

  const duration = Date.now() - startTime;
  responseTime.add(duration);
  requestCount.add(1);

  const success = check(response, {
    "content retrieval status is 200": (r) => r.status === 200,
    "content retrieval response time < 100ms": () => duration < 100,
    "content retrieval returns valid data": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id && body.content;
      } catch (e) {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }
}

// Setup function (runs once per VU)
export function setup() {
  console.log("Starting load test setup...");

  // Warm up the system
  const warmupResponse = http.get(`${BASE_URL}/health`);
  check(warmupResponse, {
    "warmup successful": (r) => r.status === 200,
  });

  return { timestamp: Date.now() };
}

// Teardown function (runs once after all VUs finish)
export function teardown(data) {
  console.log(`Load test completed. Started at: ${new Date(data.timestamp)}`);
}
