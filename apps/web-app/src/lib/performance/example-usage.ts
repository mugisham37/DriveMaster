/**
 * Performance System Usage Examples
 * Demonstrates how to use the Task 11 performance optimization components
 */

import { createPerformanceManager } from "./performance-manager";
import { getUserServiceClient } from "../../hooks/useUserServiceClient";
import { QueryClient } from "@tanstack/react-query";

// Example 1: Basic Performance Manager Setup
export async function setupPerformanceManager() {
  const userServiceClient = getUserServiceClient();
  const queryClient = new QueryClient();

  const performanceManager = createPerformanceManager(
    userServiceClient,
    queryClient,
    {
      enableRequestOptimization: true,
      enablePerformanceMonitoring: true,
      enableIntelligentPrefetching: true,
      enableWebVitalsTracking: true,
      requestOptimizer: {
        batchSize: 10,
        batchTimeout: 50,
        enableDeduplication: true,
        enableCompression: true,
      },
      performanceMonitor: {
        responseTimeThresholds: {
          p95Warning: 1000,
          p95Critical: 3000,
        },
        errorRateThresholds: {
          warning: 0.05,
          critical: 0.15,
        },
      },
    },
  );

  await performanceManager.initialize();
  return performanceManager;
}

// Example 2: Optimized Request Usage
export async function optimizedUserDataFetch(userId: string) {
  const performanceManager = await setupPerformanceManager();

  try {
    // High priority request - will be processed first
    const user = await performanceManager.optimizeRequest(
      "getUser",
      userId,
      "high",
    );

    // Medium priority requests - will be batched if possible
    const [preferences, progress] = await Promise.all([
      performanceManager.optimizeRequest(
        "getUserPreferences",
        userId,
        "medium",
      ),
      performanceManager.optimizeRequest(
        "getProgressSummary",
        userId,
        "medium",
      ),
    ]);

    return { user, preferences, progress };
  } catch (error) {
    console.error("Optimized request failed:", error);
    throw error;
  }
}

// Example 3: Navigation-based Prefetching
export async function handleRouteChange(
  from: string,
  to: string,
  userId: string,
  timeSpent: number,
) {
  const performanceManager = await setupPerformanceManager();

  // Record navigation for pattern learning
  performanceManager.recordNavigation(from, to, timeSpent);

  // Execute prefetch based on navigation
  await performanceManager.executePrefetch("navigation", {
    userId,
    currentRoute: to,
    navigationHistory: [from],
    userPreferences: {
      dataSaver: false,
      prefetchEnabled: true,
    },
  });
}

// Example 4: Performance Monitoring
export async function monitorPerformance() {
  const performanceManager = await setupPerformanceManager();

  // Get current performance statistics
  const stats = performanceManager.getStats();
  console.log("Performance Stats:", {
    averageResponseTime: stats.requestOptimization.averageResponseTime,
    p95ResponseTime: stats.performanceMonitoring.p95ResponseTime,
    cacheHitRate: stats.performanceMonitoring.cacheHitRate,
    errorRate: stats.performanceMonitoring.errorRate,
  });

  // Get health summary with recommendations
  const health = performanceManager.getHealthSummary();
  console.log("Performance Health:", health.overall);

  if (health.recommendations.length > 0) {
    console.log("Recommendations:");
    health.recommendations.forEach((rec) => console.log(`- ${rec}`));
  }

  // Log detailed performance summary
  performanceManager.logPerformanceSummary();
}

// Example 5: React Component Integration
export function ExamplePerformanceComponent() {
  // This would be used in a React component
  const exampleUsage = `
import { usePerformanceManager } from '@/hooks/usePerformanceManager'

function MyComponent() {
  const {
    performanceManager,
    stats,
    isInitialized,
    optimizeRequest,
    getHealthSummary
  } = usePerformanceManager({
    config: {
      enableRequestOptimization: true,
      enableIntelligentPrefetching: true
    },
    enableNavigationTracking: true,
    logInterval: 60000
  })

  const handleFetchUser = async () => {
    if (!isInitialized) return
    
    try {
      const user = await optimizeRequest('getUser', userId, 'high')
      setUser(user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
    }
  }

  const health = getHealthSummary()

  return (
    <div>
      <p>Performance Status: {health.overall}</p>
      {stats && (
        <div>
          <p>P95 Response Time: {stats.performanceMonitoring.p95ResponseTime}ms</p>
          <p>Cache Hit Rate: {(stats.performanceMonitoring.cacheHitRate * 100).toFixed(1)}%</p>
          <p>Total Prefetches: {stats.intelligentPrefetching.totalPrefetches}</p>
        </div>
      )}
      <button onClick={handleFetchUser}>Fetch User (Optimized)</button>
    </div>
  )
}
  `;

  return exampleUsage;
}

// Example 6: Performance Testing
export async function performanceTest() {
  const performanceManager = await setupPerformanceManager();
  const userId = "test-user-123";

  console.log("Starting performance test...");

  // Test request batching
  const startTime = Date.now();
  const requests = Array.from({ length: 20 }, (_, i) =>
    performanceManager.optimizeRequest("getUser", `user-${i}`, "medium"),
  );

  await Promise.all(requests);
  const endTime = Date.now();

  console.log(`Completed 20 requests in ${endTime - startTime}ms`);

  // Test prefetching
  await performanceManager.executePrefetch("idle", {
    userId,
    currentRoute: "/dashboard",
    navigationHistory: ["/login", "/profile"],
    userPreferences: {
      dataSaver: false,
      prefetchEnabled: true,
    },
  });

  // Get final stats
  const finalStats = performanceManager.getStats();
  console.log("Final Performance Stats:", finalStats);

  return finalStats;
}

// Example 7: Error Handling and Recovery
export async function performanceErrorHandling() {
  const performanceManager = await setupPerformanceManager();

  try {
    // This might fail
    await performanceManager.optimizeRequest(
      "nonExistentOperation",
      "test",
      "high",
    );
  } catch (error) {
    console.error("Request failed:", error);

    // Check if it's a performance-related issue
    const health = performanceManager.getHealthSummary();
    if (health.overall === "critical") {
      console.warn("Performance is critical, consider fallback strategies");

      // Reset stats if needed
      performanceManager.resetStats();
    }
  }
}

// Example 8: Cleanup and Resource Management
export async function cleanupPerformance() {
  const performanceManager = await setupPerformanceManager();

  // Flush any pending operations
  await performanceManager.flush();

  // Clean up resources
  performanceManager.destroy();

  console.log("Performance manager cleaned up");
}
