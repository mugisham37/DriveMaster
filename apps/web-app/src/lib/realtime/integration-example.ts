/**
 * Real-Time System Integration Example
 *
 * This file demonstrates how to integrate and use the real-time communication system
 * in your application. It shows best practices and common usage patterns.
 *
 * NOTE: This is an example/documentation file with simplified implementations.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState, useRef } from "react";
import {
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
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [progressData, setProgressData] = useState<Record<string, number> | null>(null);
  const [activityData, setActivityData] = useState<{ recentActivities: any[] } | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const systemRef = useRef<Awaited<ReturnType<typeof setupBasicRealtimeSystem>> | null>(null);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    const initializeSystem = async (): Promise<void> => {
      try {
        const system = await setupBasicRealtimeSystem(userId, authToken);
        systemRef.current = system;

        // Set up additional handlers for state updates
        system.setHandlers({
          onSystemConnect: () => setIsConnected(true),
          onSystemDisconnect: () => setIsConnected(false),
          onSystemReady: () => setIsReady(true),

          onProgressUpdate: (event: any) => {
            setProgressData((prev: any) => ({
              ...prev,
              [event.topic]: event.mastery?.level || event.mastery,
            }));
          },

          onActivityStream: (event: any) => {
            setActivityData((prev: any) => ({
              ...prev,
              recentActivities: [
                event.activities[0],
                ...(prev?.recentActivities || []),
              ].slice(0, 50),
            }));
          },

          onInsightGenerated: (event: any) => {
            setInsights((prev: any) => [event.insight, ...prev].slice(0, 10));
          },

          onRecommendationUpdate: (event: any) => {
            setRecommendations(event.recommendations);
          },
        });

        // Update status periodically
        const statusInterval = setInterval(() => {
          if (systemRef.current) {
            setSystemStatus(systemRef.current.getSystemStatus());
          }
        }, 5000);

        cleanupFn = () => {
          clearInterval(statusInterval);
        };
      } catch (error) {
        console.error("Failed to initialize real-time system:", error);
      }
    };

    void initializeSystem();

    return () => {
      if (cleanupFn) {
        cleanupFn();
      }
      if (systemRef.current) {
        systemRef.current.disconnect();
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
    getCachedProgress: () => systemRef.current?.getCachedProgressSummary(userId),
    getCachedStreak: () => systemRef.current?.getCachedLearningStreak(userId),
    forceSyncProgress: () => systemRef.current?.forceSyncProgress(userId),
    getUserActivityState: () => systemRef.current?.getUserActivityState(userId),
  };
}

// ============================================================================
// Advanced Usage Examples
// ============================================================================

/**
 * Example: Custom event handling for specific use cases
 */
export function setupCustomEventHandling(system: any) {
  // Handle milestone achievements with custom celebrations
  system.setHandlers({
    onMilestoneAchieved: (event: any) => {
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
    onInsightGenerated: (event: any) => {
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
    onRecommendationUpdate: (event: any) => {
      const recommendations = event.recommendations;

      // Filter recommendations based on user preferences
      const filteredRecommendations = recommendations.filter((rec: any) => {
        return shouldShowRecommendation(rec, getUserPreferences());
      });

      // Sort by priority and relevance
      const sortedRecommendations = filteredRecommendations.sort((a: any, b: any) => {
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
export function setupPerformanceMonitoring(system: any) {
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
export function setupErrorHandling(system: any) {
  system.setHandlers({
    onSystemError: (error: any) => {
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

function showMasteryAchievementCelebration(milestone: any) {
  // Implementation depends on your UI framework
  console.log("🎉 Mastery achievement:", milestone.title);
}

function showStreakAchievementCelebration(milestone: any) {
  console.log("🔥 Streak achievement:", milestone.title);
}

function showTimeAchievementCelebration(milestone: any) {
  console.log("⏰ Time achievement:", milestone.title);
}

function showAttemptsAchievementCelebration(milestone: any) {
  console.log("💪 Attempts achievement:", milestone.title);
}

function updateUserAchievements(_milestone: any) {
  // Update user's achievement collection in your data store
}

function shouldShareAchievement(milestone: any) {
  // Check user preferences and milestone significance
  return milestone.value >= 100; // Example threshold
}

function showSocialSharePrompt(_milestone: any) {
  // Show social media sharing UI
}

function showHighPriorityInsightNotification(insight: any) {
  // Show prominent notification
  console.log("High priority insight:", insight);
}

function showMediumPriorityInsightNotification(insight: any) {
  // Show standard notification
  console.log("Medium priority insight:", insight);
}

function addInsightToQueue(insight: any) {
  // Add to insight queue for later display
  console.log("Adding insight to queue:", insight);
}

function trackInsightGeneration(insight: any) {
  // Track insight analytics
  console.log("Tracking insight:", insight);
}

function shouldShowRecommendation(_recommendation: any, _userPreferences: any) {
  // Filter based on user preferences
  return true; // Simplified
}

function getUserPreferences() {
  // Get user preferences from your data store
  return {};
}

function updateRecommendationDisplay(recommendations: any) {
  // Update recommendation UI
  console.log("Updating recommendations:", recommendations);
}

function trackRecommendationUpdate(_reason: any, _count: any) {
  // Track recommendation analytics
}

function showSystemHealthAlert(_healthCheck: any) {
  // Show system health alert to user
}

function handleNetworkError(_error: any) {
  // Handle network-specific errors
}

function handleAuthError(_error: any) {
  // Handle authentication errors
}

function handleServiceError(_error: any) {
  // Handle service errors
}

function handleTimeoutError(_error: any) {
  // Handle timeout errors
}

function handleCircuitBreakerError(_error: any) {
  // Handle circuit breaker errors
}

function handleGenericError(_error: any) {
  // Handle generic errors
}

function trackRealtimeError(_error: any) {
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

