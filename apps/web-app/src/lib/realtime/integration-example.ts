/**
 * Real-Time System Integration Example
 *
 * This file demonstrates how to integrate and use the real-time communication system
 * in your application. It shows best practices and common usage patterns.
 *
 * NOTE: This is an example/documentation file with intentionally simplified types.
 * @ts-nocheck
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  getRealtimeSystem,
  initializeRealtimeSystem,
  type RealtimeSystemHandlers,
  type RealtimeSystemConfig,
} from "./realtime-system";

// ============================================================================
// Basic Integration Example
// ============================================================================

/**
 * Example: Basic real-time system setup
 */
export async function setupBasicRealtimeSystem(
  userId: string,
  authToken: string,
) {
  // Configure the system
  const config: RealtimeSystemConfig = {
    websocket: {
      url:
        process.env.NEXT_PUBLIC_USER_SERVICE_WS_URL || "ws://localhost:8080/ws",
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      enableLogging: process.env.NODE_ENV === "development",
    },
    progressUpdates: {
      enableBroadcast: true,
      enableConflictResolution: true,
      enableConsistencyChecking: true,
      updateThrottleMs: 1000,
    },
    activityMonitoring: {
      enableRealTimeInsights: true,
      enableBehaviorDetection: true,
      enableEngagementTracking: true,
      enableRecommendationUpdates: true,
      insightGenerationThreshold: 5,
      behaviorDetectionWindow: 30,
      engagementUpdateInterval: 60000,
    },
    enableAutoReconnect: true,
    enableCrossTabSync: true,
    enableMetrics: true,
    enableLogging: process.env.NODE_ENV === "development",
  };

  // Set up event handlers
  const handlers: RealtimeSystemHandlers = {
    // System events
    onSystemConnect: () => {
      console.log("Real-time system connected");
      // Update UI to show connected state
    },

    onSystemDisconnect: () => {
      console.log("Real-time system disconnected");
      // Update UI to show disconnected state
    },

    onSystemError: (error) => {
      console.error("Real-time system error:", error);
      // Show error notification to user
    },

    onSystemReady: () => {
      console.log("Real-time system ready");
      // Enable real-time features in UI
    },

    // Progress events
    onProgressUpdate: (event) => {
      console.log("Progress updated:", event.topic, event.mastery.mastery);
      // Update progress displays in UI
      // Trigger progress animations
      // Update skill mastery charts
    },

    onMilestoneAchieved: (event) => {
      console.log("Milestone achieved:", event.milestone.title);
      // Show celebration animation
      // Display achievement notification
      // Update milestone progress
    },

    onStreakUpdate: (event) => {
      console.log("Streak updated:", event.streak.currentStreak);
      // Update streak display
      // Show streak milestone notifications
    },

    onProgressSync: (event) => {
      console.log("Progress synced for user:", event.userId);
      // Refresh progress-related components
      // Update cached data
    },

    onConflictDetected: (conflict) => {
      console.warn("Progress conflict detected:", conflict.type);
      // Show conflict resolution UI
      // Allow user to choose resolution strategy
    },

    // Activity events
    onActivityStream: (event) => {
      console.log("Activity stream event:", event.type);
      // Update activity feeds
      // Refresh activity dashboards
    },

    onEngagementUpdate: (event) => {
      console.log("Engagement updated:", event.metrics.engagementScore);
      // Update engagement metrics displays
      // Show engagement trend charts
    },

    onInsightGenerated: (event) => {
      console.log("New insight:", event.insight.title);
      // Show insight notification
      // Add to insights panel
      // Trigger insight animations
    },

    onRecommendationUpdate: (event) => {
      console.log("Recommendations updated:", event.recommendations.length);
      // Update recommendation widgets
      // Show new recommendation notifications
    },

    onBehaviorPatternDetected: (event) => {
      console.log("Behavior pattern detected:", event.pattern.name);
      // Update behavior analysis displays
      // Show pattern insights
    },
  };

  // Initialize the system
  const system = await initializeRealtimeSystem(userId, authToken, config);
  system.setHandlers(handlers);

  return system;
}

// ============================================================================
// React Component Integration Example
// ============================================================================

/**
 * Example: React hook for real-time system integration
 */
export function useRealtimeIntegration(userId: string, authToken: string) {
  const [isConnected, setIsConnected] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const [systemStatus, setSystemStatus] = React.useState(null);
  const [progressData, setProgressData] = React.useState<Record<
    string,
    number
  > | null>(null);
  const [activityData, setActivityData] = React.useState<{
    recentActivities: unknown[];
  } | null>(null);
  const [insights, setInsights] = React.useState<unknown[]>([]);
  const [recommendations, setRecommendations] = React.useState<unknown[]>([]);

  React.useEffect(() => {
    let system: Awaited<ReturnType<typeof setupBasicRealtimeSystem>> | null =
      null;

    const initializeSystem = async () => {
      try {
        system = await setupBasicRealtimeSystem(userId, authToken);

        // Set up additional handlers for state updates
        system.setHandlers({
          onSystemConnect: () => setIsConnected(true),
          onSystemDisconnect: () => setIsConnected(false),
          onSystemReady: () => setIsReady(true),

          onProgressUpdate: (event: { topic: string; mastery: number }) => {
            setProgressData((prev) => ({
              ...prev,
              [event.topic]: event.mastery,
            }));
          },

          onActivityStream: (event: { activities: unknown[] }) => {
            setActivityData((prev) => ({
              ...prev,
              recentActivities: [
                event.activities[0],
                ...(prev?.recentActivities || []),
              ].slice(0, 50),
            }));
          },

          onInsightGenerated: (event: { insight: unknown }) => {
            setInsights((prev) => [event.insight, ...prev].slice(0, 10));
          },

          onRecommendationUpdate: (event: { recommendations: unknown[] }) => {
            setRecommendations(event.recommendations);
          },
        });

        // Update status periodically
        const statusInterval = setInterval(() => {
          setSystemStatus(system.getSystemStatus());
        }, 5000);

        return () => {
          clearInterval(statusInterval);
        };
      } catch (error) {
        console.error("Failed to initialize real-time system:", error);
      }
    };

    initializeSystem();

    return () => {
      if (system) {
        system.disconnect();
      }
    };
  }, [userId, authToken]);

  return {
    isConnected,
    isReady,
    systemStatus,
    progressData,
    activityData,
    insights,
    recommendations,

    // Helper functions
    getCachedProgress: () => system?.getCachedProgressSummary(userId),
    getCachedStreak: () => system?.getCachedLearningStreak(userId),
    forceSyncProgress: () => system?.forceSyncProgress(userId),
    getUserActivityState: () => system?.getUserActivityState(userId),
  };
}

// ============================================================================
// Advanced Usage Examples
// ============================================================================

/**
 * Example: Custom event handling for specific use cases
 */
export function setupCustomEventHandling(system) {
  // Handle milestone achievements with custom celebrations
  system.setHandlers({
    onMilestoneAchieved: (event) => {
      const milestone = event.milestone;

      // Different celebrations for different milestone types
      switch (milestone.type) {
        case "mastery":
          showMasteryAchievementCelebration(milestone);
          break;
        case "streak":
          showStreakAchievementCelebration(milestone);
          break;
        case "time":
          showTimeAchievementCelebration(milestone);
          break;
        case "attempts":
          showAttemptsAchievementCelebration(milestone);
          break;
      }

      // Update user's achievement collection
      updateUserAchievements(milestone);

      // Share achievement on social media (if enabled)
      if (shouldShareAchievement(milestone)) {
        showSocialSharePrompt(milestone);
      }
    },

    // Handle insights with priority-based notifications
    onInsightGenerated: (event) => {
      const insight = event.insight;

      // Show different types of notifications based on priority
      if (insight.priority >= 8) {
        showHighPriorityInsightNotification(insight);
      } else if (insight.priority >= 6) {
        showMediumPriorityInsightNotification(insight);
      } else {
        addInsightToQueue(insight);
      }

      // Track insight engagement
      trackInsightGeneration(insight);
    },

    // Handle recommendations with smart filtering
    onRecommendationUpdate: (event) => {
      const recommendations = event.recommendations;

      // Filter recommendations based on user preferences
      const filteredRecommendations = recommendations.filter((rec) => {
        return shouldShowRecommendation(rec, getUserPreferences());
      });

      // Sort by priority and relevance
      const sortedRecommendations = filteredRecommendations.sort((a, b) => {
        return b.priority * b.estimatedImpact - a.priority * a.estimatedImpact;
      });

      // Update recommendation display
      updateRecommendationDisplay(sortedRecommendations);

      // Track recommendation generation
      trackRecommendationUpdate(event.reason, sortedRecommendations.length);
    },
  });
}

/**
 * Example: Performance monitoring and optimization
 */
export function setupPerformanceMonitoring(system) {
  // Monitor system performance
  setInterval(() => {
    const status = system.getSystemStatus();
    const healthCheck = system.getHealthCheck();

    // Log performance metrics
    console.log("Real-time system metrics:", {
      connected: status.connected,
      messagesReceived: status.metrics.messagesReceived,
      messagesSent: status.metrics.messagesSent,
      uptime: status.metrics.uptime,
      health: healthCheck.status,
    });

    // Alert on performance issues
    if (healthCheck.status === "unhealthy") {
      console.warn("Real-time system is unhealthy:", healthCheck.issues);
      showSystemHealthAlert(healthCheck);
    }

    // Optimize based on metrics
    if (status.metrics.messagesReceived > 1000) {
      // High message volume - consider throttling
      console.log("High message volume detected, consider optimizing");
    }
  }, 30000); // Every 30 seconds
}

/**
 * Example: Error handling and recovery strategies
 */
export function setupErrorHandling(system) {
  system.setHandlers({
    onSystemError: (error) => {
      console.error("Real-time system error:", error);

      // Different handling based on error type
      switch (error.type) {
        case "network":
          handleNetworkError(error);
          break;
        case "authorization":
          handleAuthError(error);
          break;
        case "service":
          handleServiceError(error);
          break;
        case "timeout":
          handleTimeoutError(error);
          break;
        case "circuit_breaker":
          handleCircuitBreakerError(error);
          break;
        default:
          handleGenericError(error);
      }

      // Track errors for analytics
      trackRealtimeError(error);
    },

    onSystemDisconnect: () => {
      // Show offline indicator
      showOfflineIndicator();

      // Enable offline mode features
      enableOfflineMode();

      // Queue actions for when connection is restored
      startActionQueuing();
    },

    onSystemConnect: () => {
      // Hide offline indicator
      hideOfflineIndicator();

      // Disable offline mode
      disableOfflineMode();

      // Process queued actions
      processQueuedActions();

      // Sync any offline changes
      syncOfflineChanges();
    },
  });
}

// ============================================================================
// Helper Functions (Implementation would depend on your specific UI framework)
// ============================================================================

function showMasteryAchievementCelebration(milestone) {
  // Implementation depends on your UI framework
  console.log("🎉 Mastery achievement:", milestone.title);
}

function showStreakAchievementCelebration(milestone) {
  console.log("🔥 Streak achievement:", milestone.title);
}

function showTimeAchievementCelebration(milestone) {
  console.log("⏰ Time achievement:", milestone.title);
}

function showAttemptsAchievementCelebration(milestone) {
  console.log("💪 Attempts achievement:", milestone.title);
}

function updateUserAchievements(milestone) {
  // Update user's achievement collection in your data store
}

function shouldShareAchievement(milestone) {
  // Check user preferences and milestone significance
  return milestone.value >= 100; // Example threshold
}

function showSocialSharePrompt(milestone) {
  // Show social media sharing UI
}

function showHighPriorityInsightNotification(insight) {
  // Show prominent notification
}

function showMediumPriorityInsightNotification(insight) {
  // Show standard notification
}

function addInsightToQueue(insight) {
  // Add to insight queue for later display
}

function trackInsightGeneration(insight) {
  // Track insight analytics
}

function shouldShowRecommendation(recommendation, userPreferences) {
  // Filter based on user preferences
  return true; // Simplified
}

function getUserPreferences() {
  // Get user preferences from your data store
  return {};
}

function updateRecommendationDisplay(recommendations) {
  // Update recommendation UI
}

function trackRecommendationUpdate(reason, count) {
  // Track recommendation analytics
}

function showSystemHealthAlert(healthCheck) {
  // Show system health alert to user
}

function handleNetworkError(error) {
  // Handle network-specific errors
}

function handleAuthError(error) {
  // Handle authentication errors
}

function handleServiceError(error) {
  // Handle service errors
}

function handleTimeoutError(error) {
  // Handle timeout errors
}

function handleCircuitBreakerError(error) {
  // Handle circuit breaker errors
}

function handleGenericError(error) {
  // Handle generic errors
}

function trackRealtimeError(error) {
  // Track error analytics
}

function showOfflineIndicator() {
  // Show offline UI indicator
}

function hideOfflineIndicator() {
  // Hide offline UI indicator
}

function enableOfflineMode() {
  // Enable offline functionality
}

function disableOfflineMode() {
  // Disable offline functionality
}

function startActionQueuing() {
  // Start queuing user actions
}

function processQueuedActions() {
  // Process queued actions when connection is restored
}

function syncOfflineChanges() {
  // Sync any changes made while offline
}

// Note: This is a React import that would normally be at the top
// but is included here for the example to be self-contained
declare const React: any;
