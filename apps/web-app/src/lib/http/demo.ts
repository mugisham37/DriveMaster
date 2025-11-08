/**
 * Demo script to test HTTP client functionality
 * This can be run to verify the HTTP client works correctly
 */

import {
  httpClient,
  checkAuthServiceHealth,
  getCircuitBreakerStatus,
} from "./index";

export async function demoHttpClient() {
  console.log("🚀 HTTP Client Demo Starting...");

  // Check circuit breaker initial state
  console.log("Circuit Breaker State:", getCircuitBreakerStatus());

  // Test health check (should work without auth)
  try {
    console.log("Testing health check...");
    const isHealthy = await checkAuthServiceHealth();
    console.log(
      "Auth service health:",
      isHealthy ? "✅ Healthy" : "❌ Unhealthy",
    );
  } catch (error) {
    console.log("Health check failed:", error);
  }

  // Test a simple GET request
  try {
    console.log("Testing GET request...");
    const response = await httpClient.get("/health", { skipAuth: true });
    console.log("GET Response:", {
      status: response.status,
      correlationId: response.correlationId,
      data: response.data,
    });
  } catch (error) {
    console.log("GET request failed:", error);
  }

  // Test POST request with body
  try {
    console.log("Testing POST request...");
    const response = await httpClient.post(
      "/test",
      { message: "Hello World" },
      { skipAuth: true },
    );
    console.log("POST Response:", {
      status: response.status,
      correlationId: response.correlationId,
    });
  } catch (error) {
    console.log("POST request failed:", error);
  }

  // Check circuit breaker final state
  console.log("Final Circuit Breaker State:", getCircuitBreakerStatus());

  console.log("✅ HTTP Client Demo Complete");
}

// Export for use in browser console or Node.js
if (typeof window !== "undefined") {
  (
    window as unknown as Window & { demoHttpClient: typeof demoHttpClient }
  ).demoHttpClient = demoHttpClient;
}
