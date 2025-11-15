/**
 * Example Usage of User Service Client
 *
 * This file demonstrates how to use the unified user service client
 * for various operations including user management, progress tracking,
 * activity monitoring, and GDPR compliance.
 */

import { userServiceClient, createUserServiceClient } from "./unified-client";
import type {
  UserProfile,
  UserPreferences,
  ProgressSummary,
  ActivityRecord,
  ConsentPreferences,
  UserServiceError,
} from "@/types/user-service";

// ============================================================================
// Basic Usage Examples
// ============================================================================

/**
 * Example: User Profile Management
 */
export async function exampleUserProfileManagement(userId: string) {
  try {
    // Fetch user profile
    const profile: UserProfile = await userServiceClient.getUser(userId);
    console.log("User profile:", profile);

    // Update user profile
    const updatedProfile = await userServiceClient.updateUser(userId, {
      timezone: "America/New_York",
      language: "en",
      version: profile.version,
    });
    console.log("Updated profile:", updatedProfile);

    // Fetch and update preferences
    const preferences: UserPreferences =
      await userServiceClient.getUserPreferences(userId);
    console.log("User preferences:", preferences);

    const updatedPreferences = await userServiceClient.updatePreferences(
      userId,
      {
        theme: "dark",
        language: "en",
        notifications: {
          email: true,
          push: false,
          inApp: true,
          marketing: false,
          reminders: true,
        },
      },
    );
    console.log("Updated preferences:", updatedPreferences);
  } catch (error) {
    console.error("User profile management error:", error);
  }
}

/**
 * Example: Progress Tracking
 */
export async function exampleProgressTracking(userId: string) {
  try {
    // Get progress summary
    const progressSummary: ProgressSummary =
      await userServiceClient.getProgressSummary(userId);
    console.log("Progress summary:", progressSummary);

    // Get skill mastery for specific topics
    const skillMasteries = await userServiceClient.getSkillMastery(
      userId,
      "javascript",
    );
    console.log("JavaScript mastery:", skillMasteries);

    // Update skill mastery with new attempts
    const attempts = [
      {
        id: "attempt-1",
        userId,
        itemId: "exercise-1",
        sessionId: "session-1",
        selected: { answer: "A" },
        correct: true,
        timeTakenMs: 30000,
        hintsUsed: 0,
        clientAttemptId: "client-1",
        deviceType: "desktop",
        appVersion: "1.0.0",
        timestamp: new Date(),
        createdAt: new Date(),
      },
    ];

    const updatedMastery = await userServiceClient.updateSkillMastery(
      userId,
      "javascript",
      attempts,
    );
    console.log("Updated mastery:", updatedMastery);

    // Get learning streak
    const learningStreak = await userServiceClient.getLearningStreak(userId);
    console.log("Learning streak:", learningStreak);

    // Get milestones
    const milestones = await userServiceClient.getMilestones(userId);
    console.log("Milestones:", milestones);
  } catch (error) {
    console.error("Progress tracking error:", error);
  }
}

/**
 * Example: Activity Monitoring
 */
export async function exampleActivityMonitoring(userId: string) {
  try {
    // Record a single activity
    const activity: ActivityRecord = {
      userId,
      activityType: "lesson_complete",
      sessionId: "session-1",
      itemId: "lesson-1",
      topicId: "javascript",
      metadata: {
        score: 95,
        timeSpent: 1800000, // 30 minutes
      },
      deviceType: "desktop",
      appVersion: "1.0.0",
      platform: "web",
      userAgent: navigator.userAgent,
      ipAddress: "127.0.0.1",
      durationMs: 1800000,
      timestamp: new Date(),
    };

    const activityId = await userServiceClient.recordActivity(activity);
    console.log("Recorded activity ID:", activityId);

    // Record multiple activities in batch
    const activities: ActivityRecord[] = [
      { ...activity, activityType: "exercise_start", itemId: "exercise-1" },
      { ...activity, activityType: "exercise_complete", itemId: "exercise-1" },
    ];

    const activityIds =
      await userServiceClient.recordActivitiesBatch(activities);
    console.log("Batch activity IDs:", activityIds);

    // Get activity summary
    const dateRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date(),
    };

    const activitySummary = await userServiceClient.getActivitySummary(
      userId,
      dateRange,
    );
    console.log("Activity summary:", activitySummary);

    // Get engagement metrics for the last 30 days
    const engagementDateRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    };
    const engagementMetrics = await userServiceClient.getEngagementMetrics(
      userId,
      engagementDateRange,
    );
    console.log("Engagement metrics:", engagementMetrics);

    // TODO: Generate insights and recommendations
    // const insights = await userServiceClient.generateInsights(userId)
    // console.log('Activity insights:', insights)

    // const recommendations = await userServiceClient.generateRecommendations(userId)
    // console.log('Activity recommendations:', recommendations)
  } catch (error) {
    console.error("Activity monitoring error:", error);
  }
}

/**
 * Example: GDPR Compliance
 */
export async function exampleGDPRCompliance(userId: string) {
  try {
    // Update consent preferences
    const consentPreferences: ConsentPreferences = {
      analytics: true,
      marketing: false,
      personalization: true,
      thirdPartySharing: false,
      dataRetention: {
        profile: 365,
        activity: 90,
        progress: 180,
      },
      communicationChannels: {
        email: true,
        sms: false,
        push: true,
        inApp: true,
      },
    };

    await userServiceClient.updateConsent(userId, consentPreferences);
    console.log("Consent preferences updated");

    // Request data export
    const exportResponse = await userServiceClient.exportUserData(userId);
    console.log("Data export requested:", exportResponse);

    // Generate privacy report
    const privacyReport = await userServiceClient.generatePrivacyReport(userId);
    console.log("Privacy report:", privacyReport);

    // Note: Data deletion would typically require additional confirmation
    // const deleteResponse = await userServiceClient.deleteUserData(userId)
    // console.log('Data deletion requested:', deleteResponse)
  } catch (error) {
    console.error("GDPR compliance error:", error);
  }
}

/**
 * Example: Real-Time Streaming
 */
export async function exampleRealTimeStreaming(userId: string) {
  try {
    // Subscribe to progress updates
    const progressStreamId = userServiceClient.subscribeToProgressUpdates(
      userId,
      {
        onData: (progressUpdate: unknown) => {
          console.log("Progress update received:", progressUpdate);
        },
        onError: (error: unknown) => {
          console.error("Progress stream error:", error);
        },
        onEnd: () => {
          console.log("Progress stream ended");
        },
      },
    );

    // Subscribe to activity updates
    const activityStreamId = userServiceClient.subscribeToActivityUpdates(
      userId,
      {
        onData: (activityUpdate: unknown) => {
          console.log("Activity update received:", activityUpdate);
        },
        onError: (error: unknown) => {
          console.error("Activity stream error:", error);
        },
        onEnd: () => {
          console.log("Activity stream ended");
        },
      },
    );

    // Later, unsubscribe from streams
    setTimeout(() => {
      userServiceClient.unsubscribeFromStream(progressStreamId);
      userServiceClient.unsubscribeFromStream(activityStreamId);
      console.log("Unsubscribed from streams");
    }, 60000); // Unsubscribe after 1 minute
  } catch (error) {
    console.error("Real-time streaming error:", error);
  }
}

/**
 * Example: Service Health Monitoring
 */
export async function exampleServiceHealthMonitoring() {
  try {
    // Check service health
    const isHealthy = await userServiceClient.isHealthy();
    console.log("Service is healthy:", isHealthy);

    // Get detailed health status
    const healthStatus = await userServiceClient.getHealth();
    console.log("Health status:", healthStatus);

    // Get service information
    const serviceInfo = await userServiceClient.getServiceInfo();
    console.log("Service info:", serviceInfo);

    // Get client metrics
    const metrics = userServiceClient.getMetrics();
    console.log("Client metrics:", metrics);

    // Get active streams
    const activeStreams = userServiceClient.getActiveStreams();
    console.log("Active streams:", activeStreams);
  } catch (error) {
    console.error("Service health monitoring error:", error);
  }
}

/**
 * Example: Custom Client Configuration
 */
export function exampleCustomClientConfiguration() {
  // Create a custom client with specific configuration
  const customClient = createUserServiceClient({
    httpConfig: {
      timeout: 15000,
      retryAttempts: 5,
      enableRequestLogging: true,
    },
    grpcConfig: {
      timeout: 20000,
      enableStreaming: true,
      enableRequestLogging: true,
    },
    protocolSelection: "http", // Force HTTP protocol
    enableConnectionPooling: true,
    enableMetrics: true,
  });

  console.log(
    "Custom client created with configuration:",
    customClient.getConfig(),
  );

  // Use the custom client for operations
  return customClient;
}

/**
 * Example: Error Handling and Recovery
 */
export async function exampleErrorHandlingAndRecovery(userId: string) {
  try {
    // This might fail due to network issues, service unavailability, etc.
    const profile = await userServiceClient.getUser(userId);
    console.log("Profile fetched successfully:", profile);
  } catch (error) {
    console.error("Operation failed:", error);

    // The client automatically handles:
    // - Retries with exponential backoff
    // - Circuit breaker protection
    // - Error classification and user-friendly messages
    // - Graceful degradation

    // You can check the error type and handle accordingly
    if (error && typeof error === "object" && "type" in error) {
      const userServiceError = error as UserServiceError;

      switch (userServiceError.type) {
        case "network":
          console.log("Network error - check connection");
          break;
        case "authorization":
          console.log("Authorization error - user needs to sign in");
          break;
        case "circuit_breaker":
          console.log("Service temporarily unavailable - try again later");
          break;
        default:
          console.log("Other error type:", userServiceError.type);
      }

      if (userServiceError.retryAfter) {
        console.log(`Retry after ${userServiceError.retryAfter} seconds`);
      }
    }
  }
}

/**
 * Example: Cleanup
 */
export function exampleCleanup() {
  // Clean up resources when done
  userServiceClient.cleanup();
  console.log("User service client cleaned up");
}
