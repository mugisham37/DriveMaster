/**
 * Real-Time Activity Monitoring System
 *
 * Implements Task 10.3:
 * - Real-time activity event streaming and processing
 * - Live engagement metrics updates
 * - Real-time insight generation and notification
 * - Activity recommendation updates based on real-time behavior
 * - Requirements: 9.1, 9.2, 4.2, 4.4
 */

import {
  WebSocketManager,
  type ActivityUpdateData,
  type EngagementUpdateData,
  type NotificationData,
} from "./websocket-manager";
import type {
  ActivityRecord,
  EngagementMetrics,
  ActivityInsight,
  ActivityRecommendation,
  BehaviorPattern,
  UserServiceError,
} from "@/types/user-service";

// ============================================================================
// Activity Monitoring Types
// ============================================================================

export interface ActivityStreamEvent {
  type:
    | "activity_recorded"
    | "activity_batch"
    | "session_started"
    | "session_ended";
  userId: string;
  activities: ActivityRecord[];
  sessionId?: string | undefined;
  timestamp: Date;
  source: "websocket" | "local" | "broadcast";
}

export interface EngagementUpdateEvent {
  type: "engagement_update";
  userId: string;
  metrics: EngagementMetrics;
  changes: EngagementChange[];
  timestamp: Date;
  source: "websocket" | "calculated";
}

export interface InsightGeneratedEvent {
  type: "insight_generated";
  userId: string;
  insight: ActivityInsight;
  trigger: "real_time" | "scheduled" | "threshold";
  timestamp: Date;
}

export interface RecommendationUpdateEvent {
  type: "recommendation_update";
  userId: string;
  recommendations: ActivityRecommendation[];
  reason: "behavior_change" | "new_activity" | "time_based" | "performance";
  timestamp: Date;
}

export interface BehaviorPatternEvent {
  type: "behavior_pattern_detected";
  userId: string;
  pattern: BehaviorPattern;
  confidence: number;
  timestamp: Date;
}

export type ActivityRealtimeEvent =
  | ActivityStreamEvent
  | EngagementUpdateEvent
  | InsightGeneratedEvent
  | RecommendationUpdateEvent
  | BehaviorPatternEvent;

// ============================================================================
// Configuration and Handlers
// ============================================================================

export interface ActivityMonitoringConfig {
  enableRealTimeInsights?: boolean;
  enableBehaviorDetection?: boolean;
  enableEngagementTracking?: boolean;
  enableRecommendationUpdates?: boolean;
  insightGenerationThreshold?: number;
  behaviorDetectionWindow?: number; // minutes
  engagementUpdateInterval?: number; // milliseconds
  maxRecentActivities?: number;
}

export interface ActivityMonitoringHandlers {
  onActivityStream?: (event: ActivityStreamEvent) => void;
  onEngagementUpdate?: (event: EngagementUpdateEvent) => void;
  onInsightGenerated?: (event: InsightGeneratedEvent) => void;
  onRecommendationUpdate?: (event: RecommendationUpdateEvent) => void;
  onBehaviorPatternDetected?: (event: BehaviorPatternEvent) => void;
  onError?: (error: UserServiceError) => void;
}

export interface EngagementChange {
  metric: keyof EngagementMetrics;
  oldValue: number | string;
  newValue: number | string;
  change: number;
  changePercent: number;
}

// ============================================================================
// Activity Monitoring State
// ============================================================================

export interface ActivityMonitoringState {
  recentActivities: Map<string, ActivityRecord[]>;
  currentSessions: Map<string, ActivitySession>;
  engagementMetrics: Map<string, EngagementMetrics>;
  behaviorPatterns: Map<string, BehaviorPattern[]>;
  activeInsights: Map<string, ActivityInsight[]>;
  currentRecommendations: Map<string, ActivityRecommendation[]>;
}

export interface ActivitySession {
  id: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  activities: ActivityRecord[];
  isActive: boolean;
}

// ============================================================================
// Activity Monitoring Manager
// ============================================================================

export class ActivityMonitoringManager {
  private wsManager: WebSocketManager;
  private config: ActivityMonitoringConfig;
  private handlers: ActivityMonitoringHandlers = {};
  private state: ActivityMonitoringState;

  private engagementUpdateTimer: NodeJS.Timeout | null = null;
  private behaviorDetectionTimer: NodeJS.Timeout | null = null;
  private insightGenerationTimer: NodeJS.Timeout | null = null;

  private broadcastChannel: BroadcastChannel | null = null;
  private tabId: string;

  constructor(
    wsManager: WebSocketManager,
    config: ActivityMonitoringConfig = {},
  ) {
    this.wsManager = wsManager;
    this.config = {
      enableRealTimeInsights: true,
      enableBehaviorDetection: true,
      enableEngagementTracking: true,
      enableRecommendationUpdates: true,
      insightGenerationThreshold: 5, // activities
      behaviorDetectionWindow: 30, // minutes
      engagementUpdateInterval: 60000, // 1 minute
      maxRecentActivities: 100,
      ...config,
    };

    this.tabId = this.generateTabId();
    this.state = this.initializeState();

    this.setupWebSocketHandlers();
    this.setupBroadcastChannel();
    this.startPeriodicTasks();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeState(): ActivityMonitoringState {
    return {
      recentActivities: new Map(),
      currentSessions: new Map(),
      engagementMetrics: new Map(),
      behaviorPatterns: new Map(),
      activeInsights: new Map(),
      currentRecommendations: new Map(),
    };
  }

  private setupWebSocketHandlers(): void {
    this.wsManager.setEventHandlers({
      onActivityUpdate: (data) => this.handleActivityUpdate(data),
      onEngagementUpdate: (data) => this.handleEngagementUpdate(data),
      onNotification: (data) => this.handleNotification(data),
      onError: (error) => this.handleError(error),
    });
  }

  private setupBroadcastChannel(): void {
    if (typeof window === "undefined") return;

    try {
      this.broadcastChannel = new BroadcastChannel("activity_monitoring");

      this.broadcastChannel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data);
      };
    } catch (error) {
      console.warn(
        "[ActivityMonitoringManager] Failed to setup broadcast channel:",
        error,
      );
    }
  }

  private startPeriodicTasks(): void {
    // Start engagement metrics updates
    if (this.config.enableEngagementTracking) {
      this.engagementUpdateTimer = setInterval(() => {
        this.updateEngagementMetrics();
      }, this.config.engagementUpdateInterval!);
    }

    // Start behavior pattern detection
    if (this.config.enableBehaviorDetection) {
      this.behaviorDetectionTimer = setInterval(
        () => {
          this.detectBehaviorPatterns();
        },
        this.config.behaviorDetectionWindow! * 60 * 1000,
      );
    }

    // Start insight generation
    if (this.config.enableRealTimeInsights) {
      this.insightGenerationTimer = setInterval(
        () => {
          this.generateRealTimeInsights();
        },
        5 * 60 * 1000,
      ); // Every 5 minutes
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  setHandlers(handlers: ActivityMonitoringHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  removeHandler(event: keyof ActivityMonitoringHandlers): void {
    delete this.handlers[event];
  }

  // ============================================================================
  // WebSocket Event Processing
  // ============================================================================

  private handleActivityUpdate(data: ActivityUpdateData): void {
    const userId = data.userId;

    // Update recent activities
    this.addRecentActivity(userId, data.activity);

    // Update current session
    this.updateCurrentSession(userId, data.activity, data.sessionId);

    // Create activity stream event
    const event: ActivityStreamEvent = {
      type: "activity_recorded",
      userId,
      activities: [data.activity],
      sessionId: data.sessionId || undefined,
      timestamp: data.timestamp,
      source: "websocket",
    };

    // Process the activity for insights and recommendations
    this.processActivityForInsights(userId, data.activity);

    // Broadcast to other tabs
    this.broadcastActivityUpdate(event);

    // Notify handlers
    this.handlers.onActivityStream?.(event);
  }

  private handleEngagementUpdate(data: EngagementUpdateData): void {
    const userId = data.userId;
    const previousMetrics = this.state.engagementMetrics.get(userId);

    // Calculate changes
    const changes = this.calculateEngagementChanges(
      previousMetrics,
      data.metrics,
    );

    // Update state
    this.state.engagementMetrics.set(userId, data.metrics);

    // Create engagement update event
    const event: EngagementUpdateEvent = {
      type: "engagement_update",
      userId,
      metrics: data.metrics,
      changes,
      timestamp: data.timestamp,
      source: "websocket",
    };

    // Check for significant changes that might trigger recommendations
    this.checkEngagementThresholds(userId, data.metrics, changes);

    // Notify handlers
    this.handlers.onEngagementUpdate?.(event);
  }

  private handleNotification(data: NotificationData): void {
    // Handle activity-related notifications
    if (data.type === "info" && data.title.includes("Insight")) {
      // This is an insight notification
      this.handleInsightNotification(data);
    } else if (
      data.type === "success" &&
      data.title.includes("Recommendation")
    ) {
      // This is a recommendation notification
      this.handleRecommendationNotification(data);
    }
  }

  // ============================================================================
  // Activity Processing
  // ============================================================================

  private addRecentActivity(userId: string, activity: ActivityRecord): void {
    const activities = this.state.recentActivities.get(userId) || [];
    activities.unshift(activity);

    // Keep only the most recent activities
    if (activities.length > this.config.maxRecentActivities!) {
      activities.splice(this.config.maxRecentActivities!);
    }

    this.state.recentActivities.set(userId, activities);
  }

  private updateCurrentSession(
    userId: string,
    activity: ActivityRecord,
    sessionId?: string,
  ): void {
    if (!sessionId) return;

    let session = this.state.currentSessions.get(sessionId);

    if (!session) {
      session = {
        id: sessionId,
        userId,
        startTime: activity.timestamp,
        lastActivity: activity.timestamp,
        activities: [],
        isActive: true,
      };
    }

    session.activities.push(activity);
    session.lastActivity = activity.timestamp;

    this.state.currentSessions.set(sessionId, session);
  }

  private processActivityForInsights(
    userId: string,
    _activity: ActivityRecord,
  ): void {
    if (!this.config.enableRealTimeInsights) return;

    const recentActivities = this.state.recentActivities.get(userId) || [];

    // Check if we have enough activities to generate insights
    if (recentActivities.length >= this.config.insightGenerationThreshold!) {
      this.generateActivityInsight(userId, _activity, recentActivities);
    }

    // Check for behavior patterns
    if (this.config.enableBehaviorDetection) {
      this.checkForBehaviorPatterns(userId, _activity, recentActivities);
    }

    // Update recommendations based on new activity
    if (this.config.enableRecommendationUpdates) {
      this.updateRecommendationsForActivity(userId, _activity);
    }
  }

  // ============================================================================
  // Insight Generation
  // ============================================================================

  private generateActivityInsight(
    userId: string,
    triggerActivity: ActivityRecord,
    recentActivities: ActivityRecord[],
  ): void {
    // Analyze recent activities to generate insights
    const insights = this.analyzeActivitiesForInsights(
      userId,
      recentActivities,
      triggerActivity,
    );

    insights.forEach((insight) => {
      const event: InsightGeneratedEvent = {
        type: "insight_generated",
        userId,
        insight,
        trigger: "real_time",
        timestamp: new Date(),
      };

      // Add to active insights
      const userInsights = this.state.activeInsights.get(userId) || [];
      userInsights.unshift(insight);

      // Keep only recent insights
      if (userInsights.length > 10) {
        userInsights.splice(10);
      }

      this.state.activeInsights.set(userId, userInsights);

      // Notify handlers
      this.handlers.onInsightGenerated?.(event);
    });
  }

  private analyzeActivitiesForInsights(
    userId: string,
    activities: ActivityRecord[],
    triggerActivity: ActivityRecord,
  ): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    // Analyze activity patterns
    const activityTypes = activities.map((a) => a.activityType);
    const uniqueTypes = new Set(activityTypes);

    // Check for focus patterns
    if (uniqueTypes.size === 1 && activities.length >= 5) {
      insights.push({
        id: `insight_${Date.now()}_focus`,
        userId,
        type: "focus_pattern",
        title: "Focused Learning Session",
        description: `You've been consistently working on ${triggerActivity.activityType} activities. Great focus!`,
        severity: "info",
        category: "behavior",
        priority: 7,
        actionable: true,
        metadata: {
          activityType: triggerActivity.activityType,
          sessionLength: activities.length.toString(),
          pattern: "focused_session",
        },
        actionItems: [
          "Consider taking a short break to maintain focus",
          "Try mixing in different types of activities for variety",
        ],
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      });
    }

    // Check for rapid completion patterns
    const completionActivities = activities.filter(
      (a) =>
        a.activityType.includes("complete") ||
        a.activityType.includes("finish"),
    );

    if (completionActivities.length >= 3) {
      insights.push({
        id: `insight_${Date.now()}_productivity`,
        userId,
        type: "productivity_streak",
        title: "High Productivity Detected",
        description: `You've completed ${completionActivities.length} activities recently. You're on fire!`,
        severity: "info",
        category: "performance",
        priority: 8,
        actionable: true,
        metadata: {
          completions: completionActivities.length.toString(),
          timeframe: "30 minutes",
          pattern: "high_productivity",
        },
        actionItems: [
          "Keep up the momentum!",
          "Consider setting a new personal goal",
        ],
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      });
    }

    return insights;
  }

  // ============================================================================
  // Behavior Pattern Detection
  // ============================================================================

  private checkForBehaviorPatterns(
    userId: string,
    _activity: ActivityRecord,
    recentActivities: ActivityRecord[],
  ): void {
    const patterns = this.detectActivityPatterns(userId, recentActivities);

    patterns.forEach((pattern) => {
      const event: BehaviorPatternEvent = {
        type: "behavior_pattern_detected",
        userId,
        pattern,
        confidence: pattern.confidence,
        timestamp: new Date(),
      };

      // Update behavior patterns state
      const userPatterns = this.state.behaviorPatterns.get(userId) || [];
      const existingIndex = userPatterns.findIndex(
        (p) => p.pattern === pattern.pattern,
      );

      if (existingIndex >= 0) {
        userPatterns[existingIndex] = pattern;
      } else {
        userPatterns.push(pattern);
      }

      this.state.behaviorPatterns.set(userId, userPatterns);

      // Notify handlers
      this.handlers.onBehaviorPatternDetected?.(event);
    });
  }

  private detectActivityPatterns(
    _userId: string,
    activities: ActivityRecord[],
  ): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    if (activities.length < 5) return patterns;

    // Detect time-based patterns
    const hours = activities.map((a) => a.timestamp.getHours());
    const hourCounts = hours.reduce(
      (acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    const mostActiveHour = Object.entries(hourCounts).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (mostActiveHour && mostActiveHour[1] >= 3) {
      patterns.push({
        pattern: "time_preference",
        frequency: mostActiveHour[1],
        confidence: Math.min(mostActiveHour[1] / activities.length, 1),
        description: `Most active during hour ${mostActiveHour[0]}`,
        type: "temporal",
        name: "Peak Activity Time",
        metadata: {
          preferredHour: mostActiveHour[0],
          activityCount: mostActiveHour[1].toString(),
          totalActivities: activities.length.toString(),
        },
      });
    }

    // Detect activity type preferences
    const typeCounts = activities.reduce(
      (acc, activity) => {
        acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const preferredType = Object.entries(typeCounts).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (preferredType && preferredType[1] >= activities.length * 0.4) {
      patterns.push({
        pattern: "activity_preference",
        frequency: preferredType[1],
        confidence: preferredType[1] / activities.length,
        description: `Prefers ${preferredType[0]} activities`,
        type: "preference",
        name: "Activity Type Preference",
        metadata: {
          preferredType: preferredType[0],
          frequency: preferredType[1].toString(),
          percentage: ((preferredType[1] / activities.length) * 100).toFixed(1),
        },
      });
    }

    return patterns;
  }

  // ============================================================================
  // Recommendation Updates
  // ============================================================================

  private updateRecommendationsForActivity(
    userId: string,
    _activity: ActivityRecord,
  ): void {
    const recommendations = this.generateActivityRecommendations(
      userId,
      _activity,
    );

    if (recommendations.length > 0) {
      const event: RecommendationUpdateEvent = {
        type: "recommendation_update",
        userId,
        recommendations,
        reason: "new_activity",
        timestamp: new Date(),
      };

      // Update recommendations state
      this.state.currentRecommendations.set(userId, recommendations);

      // Notify handlers
      this.handlers.onRecommendationUpdate?.(event);
    }
  }

  private generateActivityRecommendations(
    userId: string,
    _activity: ActivityRecord,
  ): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];
    const recentActivities = this.state.recentActivities.get(userId) || [];

    // Recommend variety if user is doing the same activity repeatedly
    const recentSameType = recentActivities
      .slice(0, 5)
      .filter((a) => a.activityType === _activity.activityType);

    if (recentSameType.length >= 4) {
      recommendations.push({
        id: `rec_${Date.now()}_variety`,
        userId,
        type: "variety_suggestion",
        title: "Try Something Different",
        description: `You've been focusing on ${_activity.activityType}. Consider mixing in other activities for better learning.`,
        priority: 6,
        category: "strategy",
        estimatedImpact: 0.7,
        actionable: true,
        metadata: {
          currentActivity: _activity.activityType,
          repetitionCount: recentSameType.length.toString(),
          suggestion: "variety",
        },
        actions: [
          {
            type: "navigate",
            label: "Explore Other Activities",
            url: "/activities",
          },
        ],
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        applied: false,
      });
    }

    // Recommend break if user has been very active
    if (recentActivities.length >= 10) {
      const firstActivity = recentActivities[0];
      const lastActivity = recentActivities[recentActivities.length - 1];
      if (!firstActivity || !lastActivity) return recommendations;

      const timeSpan =
        firstActivity.timestamp.getTime() - lastActivity.timestamp.getTime();

      if (timeSpan < 2 * 60 * 60 * 1000) {
        // Less than 2 hours
        recommendations.push({
          id: `rec_${Date.now()}_break`,
          userId,
          type: "break_suggestion",
          title: "Consider Taking a Break",
          description:
            "You've been very active! A short break can help improve focus and retention.",
          priority: 8,
          category: "timing",
          estimatedImpact: 0.8,
          actionable: true,
          metadata: {
            activityCount: recentActivities.length.toString(),
            timeSpan: Math.round(timeSpan / (60 * 1000)).toString(), // minutes
            suggestion: "break",
          },
          actions: [
            {
              type: "schedule",
              label: "Set Break Reminder",
              metadata: { duration: 15 }, // 15 minutes
            },
          ],
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          applied: false,
        });
      }
    }

    return recommendations;
  }

  // ============================================================================
  // Engagement Metrics
  // ============================================================================

  private updateEngagementMetrics(): void {
    this.state.recentActivities.forEach((activities, userId) => {
      if (activities.length === 0) return;

      const _metrics = this.calculateEngagementMetrics(userId, activities);
      const previousMetrics = this.state.engagementMetrics.get(userId);
      const changes = this.calculateEngagementChanges(
        previousMetrics,
        _metrics,
      );

      this.state.engagementMetrics.set(userId, _metrics);

      const event: EngagementUpdateEvent = {
        type: "engagement_update",
        userId,
        metrics: _metrics,
        changes,
        timestamp: new Date(),
        source: "calculated",
      };

      this.handlers.onEngagementUpdate?.(event);
    });
  }

  private calculateEngagementMetrics(
    _userId: string,
    activities: ActivityRecord[],
  ): EngagementMetrics {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentActivities = activities.filter((a) => a.timestamp >= oneDayAgo);
    const weeklyActivities = activities.filter(
      (a) => a.timestamp >= oneWeekAgo,
    );

    // Calculate session information
    const sessions = this.groupActivitiesIntoSessions(activities);
    const activeSessions = sessions.filter((s) => s.activities.length > 0);

    const totalSessionTime = activeSessions.reduce((sum, session) => {
      const lastActivity = session.activities[session.activities.length - 1];
      const firstActivity = session.activities[0];
      if (lastActivity && firstActivity) {
        const duration =
          lastActivity.timestamp.getTime() - firstActivity.timestamp.getTime();
        return sum + duration;
      }
      return sum;
    }, 0);

    const averageSessionTime =
      activeSessions.length > 0 ? totalSessionTime / activeSessions.length : 0;

    return {
      dailyActiveStreak: this.calculateDailyStreak(activities),
      weeklyActiveStreak: this.calculateWeeklyStreak(activities),
      averageSessionLength: averageSessionTime,
      averageSessionDuration: averageSessionTime, // Same as length for now
      sessionsPerDay: activeSessions.length,
      activitiesPerSession:
        activeSessions.length > 0
          ? activeSessions.reduce((sum, s) => sum + s.activities.length, 0) /
            activeSessions.length
          : 0,
      returnRate: this.calculateReturnRate(activities),
      engagementScore: this.calculateEngagementScore(
        recentActivities,
        weeklyActivities,
      ),
      churnRisk: this.assessChurnRisk(activities),
    };
  }

  private calculateEngagementChanges(
    previous: EngagementMetrics | undefined,
    current: EngagementMetrics,
  ): EngagementChange[] {
    if (!previous) return [];

    const changes: EngagementChange[] = [];

    Object.entries(current).forEach(([key, value]) => {
      const prevValue = previous[key as keyof EngagementMetrics];

      if (typeof value === "number" && typeof prevValue === "number") {
        const change = value - prevValue;
        const changePercent = prevValue !== 0 ? (change / prevValue) * 100 : 0;

        if (Math.abs(changePercent) > 5) {
          // Only report significant changes
          changes.push({
            metric: key as keyof EngagementMetrics,
            oldValue: prevValue,
            newValue: value,
            change,
            changePercent,
          });
        }
      }
    });

    return changes;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private groupActivitiesIntoSessions(
    activities: ActivityRecord[],
  ): ActivitySession[] {
    const sessions: ActivitySession[] = [];
    let currentSession: ActivitySession | null = null;

    activities.forEach((activity) => {
      if (
        !currentSession ||
        activity.timestamp.getTime() - currentSession.lastActivity.getTime() >
          30 * 60 * 1000
      ) {
        // Start new session if more than 30 minutes gap
        currentSession = {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: activity.userId,
          startTime: activity.timestamp,
          lastActivity: activity.timestamp,
          activities: [activity],
          isActive: true,
        };
        sessions.push(currentSession);
      } else {
        currentSession.activities.push(activity);
        currentSession.lastActivity = activity.timestamp;
      }
    });

    return sessions;
  }

  private calculateDailyStreak(activities: ActivityRecord[]): number {
    // Simplified streak calculation
    const today = new Date();
    let streak = 0;
    const currentDate = new Date(today);

    for (let i = 0; i < 30; i++) {
      // Check last 30 days
      const dayActivities = activities.filter(
        (a) => a.timestamp.toDateString() === currentDate.toDateString(),
      );

      if (dayActivities.length > 0) {
        streak++;
      } else if (streak > 0) {
        break;
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  private calculateWeeklyStreak(activities: ActivityRecord[]): number {
    // Simplified weekly streak calculation
    return Math.floor(this.calculateDailyStreak(activities) / 7);
  }

  private calculateReturnRate(activities: ActivityRecord[]): number {
    // Simplified return rate calculation
    const uniqueDays = new Set(
      activities.map((a) => a.timestamp.toDateString()),
    ).size;
    const lastActivity = activities[activities.length - 1];
    const totalDays = Math.max(
      1,
      Math.ceil(
        (Date.now() - (lastActivity?.timestamp.getTime() || 0)) /
          (24 * 60 * 60 * 1000),
      ),
    );

    return Math.min(uniqueDays / totalDays, 1);
  }

  private calculateEngagementScore(
    recentActivities: ActivityRecord[],
    weeklyActivities: ActivityRecord[],
  ): number {
    // Simplified engagement score calculation
    const recentScore = Math.min(recentActivities.length / 10, 1) * 0.4;
    const weeklyScore = Math.min(weeklyActivities.length / 50, 1) * 0.6;

    return recentScore + weeklyScore;
  }

  private assessChurnRisk(
    activities: ActivityRecord[],
  ): "low" | "medium" | "high" {
    if (activities.length === 0) return "high";

    const firstActivity = activities[0];
    if (!firstActivity) return "high";

    const lastActivity = firstActivity.timestamp;
    const daysSinceLastActivity =
      (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000);

    if (daysSinceLastActivity > 7) return "high";
    if (daysSinceLastActivity > 3) return "medium";
    return "low";
  }

  private checkEngagementThresholds(
    userId: string,
    _metrics: EngagementMetrics,
    changes: EngagementChange[],
  ): void {
    // Check for significant engagement changes that might trigger recommendations
    const significantChanges = changes.filter(
      (c) => Math.abs(c.changePercent) > 20,
    );

    if (significantChanges.length > 0) {
      // Generate recommendations based on engagement changes
      const recommendations = this.generateEngagementRecommendations(
        userId,
        _metrics,
        significantChanges,
      );

      if (recommendations.length > 0) {
        const event: RecommendationUpdateEvent = {
          type: "recommendation_update",
          userId,
          recommendations,
          reason: "behavior_change",
          timestamp: new Date(),
        };

        this.state.currentRecommendations.set(userId, recommendations);
        this.handlers.onRecommendationUpdate?.(event);
      }
    }
  }

  private generateEngagementRecommendations(
    userId: string,
    _metrics: EngagementMetrics,
    changes: EngagementChange[],
  ): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];

    // Check for declining engagement
    const negativeChanges = changes.filter((c) => c.change < 0);
    if (negativeChanges.length > 0) {
      recommendations.push({
        id: `rec_${Date.now()}_engagement`,
        userId,
        type: "engagement_boost",
        title: "Boost Your Engagement",
        description:
          "Your engagement has decreased recently. Try these strategies to get back on track.",
        priority: 9,
        category: "engagement",
        estimatedImpact: 0.8,
        actionable: true,
        metadata: {
          declinedMetrics: negativeChanges.map((c) => c.metric),
          averageDecline:
            negativeChanges.reduce(
              (sum, c) => sum + Math.abs(c.changePercent),
              0,
            ) / negativeChanges.length,
        },
        actions: [
          {
            type: "navigate",
            label: "Try New Activities",
            url: "/activities/explore",
          },
          {
            type: "schedule",
            label: "Set Learning Reminder",
            metadata: { frequency: "daily" },
          },
        ],
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        applied: false,
      });
    }

    return recommendations;
  }

  // ============================================================================
  // Periodic Tasks
  // ============================================================================

  private detectBehaviorPatterns(): void {
    this.state.recentActivities.forEach((activities, userId) => {
      if (activities.length >= 10) {
        const patterns = this.detectActivityPatterns(userId, activities);

        patterns.forEach((pattern) => {
          const event: BehaviorPatternEvent = {
            type: "behavior_pattern_detected",
            userId,
            pattern,
            confidence: pattern.confidence,
            timestamp: new Date(),
          };

          this.handlers.onBehaviorPatternDetected?.(event);
        });
      }
    });
  }

  private generateRealTimeInsights(): void {
    this.state.recentActivities.forEach((activities, userId) => {
      if (activities.length >= this.config.insightGenerationThreshold!) {
        const firstActivity = activities[0];
        if (!firstActivity) return;
        const insights = this.analyzeActivitiesForInsights(
          userId,
          activities,
          firstActivity,
        );

        insights.forEach((insight) => {
          const event: InsightGeneratedEvent = {
            type: "insight_generated",
            userId,
            insight,
            trigger: "scheduled",
            timestamp: new Date(),
          };

          this.handlers.onInsightGenerated?.(event);
        });
      }
    });
  }

  // ============================================================================
  // Broadcasting
  // ============================================================================

  private broadcastActivityUpdate(event: ActivityStreamEvent): void {
    if (!this.broadcastChannel) return;

    try {
      this.broadcastChannel.postMessage({
        type: "activity_update",
        data: event,
        tabId: this.tabId,
        timestamp: new Date(),
      });
    } catch (error) {
      console.warn(
        "[ActivityMonitoringManager] Failed to broadcast activity update:",
        error,
      );
    }
  }

  private handleBroadcastMessage(message: {
    type: string;
    data: ActivityStreamEvent;
    tabId: string;
  }): void {
    if (message.tabId === this.tabId) return;

    if (message.type === "activity_update") {
      const event = message.data as ActivityStreamEvent;
      event.source = "broadcast";
      this.handlers.onActivityStream?.(event);
    }
  }

  private handleInsightNotification(data: NotificationData): void {
    // Parse insight from notification data
    try {
      const insight: ActivityInsight = {
        id: data.id,
        userId: data.userId,
        type: "notification_insight",
        title: data.title,
        description: data.message,
        severity: data.type === "error" ? "critical" : "info",
        category: "engagement",
        priority: 5,
        actionable: !!data.actionUrl,
        metadata: {
          source: "notification",
          originalType: data.type,
        },
        actionItems: data.actionUrl ? [`Visit: ${data.actionUrl}`] : [],
        generatedAt: data.timestamp,
      };

      const event: InsightGeneratedEvent = {
        type: "insight_generated",
        userId: data.userId,
        insight,
        trigger: "real_time",
        timestamp: data.timestamp,
      };

      this.handlers.onInsightGenerated?.(event);
    } catch (error) {
      console.warn(
        "[ActivityMonitoringManager] Failed to parse insight notification:",
        error,
      );
    }
  }

  private handleRecommendationNotification(data: NotificationData): void {
    // Parse recommendation from notification data
    try {
      const recommendation: ActivityRecommendation = {
        id: data.id,
        userId: data.userId,
        type: "notification_recommendation",
        title: data.title,
        description: data.message,
        priority: 6,
        category: "engagement",
        estimatedImpact: 0.7,
        actionable: !!data.actionUrl,
        metadata: {
          source: "notification",
          originalType: data.type,
        },
        actions: data.actionUrl
          ? [
              {
                type: "navigate",
                label: "Take Action",
                url: data.actionUrl,
              },
            ]
          : [],
        generatedAt: data.timestamp,
        applied: false,
      };

      const event: RecommendationUpdateEvent = {
        type: "recommendation_update",
        userId: data.userId,
        recommendations: [recommendation],
        reason: "time_based",
        timestamp: data.timestamp,
      };

      this.handlers.onRecommendationUpdate?.(event);
    } catch (error) {
      console.warn(
        "[ActivityMonitoringManager] Failed to parse recommendation notification:",
        error,
      );
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Subscribe to activity monitoring for a user
   */
  subscribeToActivityMonitoring(userId: string): void {
    this.wsManager.subscribe([
      `activities:${userId}`,
      `engagement:${userId}`,
      `insights:${userId}`,
      `recommendations:${userId}`,
    ]);
  }

  /**
   * Unsubscribe from activity monitoring for a user
   */
  unsubscribeFromActivityMonitoring(userId: string): void {
    this.wsManager.unsubscribe([
      `activities:${userId}`,
      `engagement:${userId}`,
      `insights:${userId}`,
      `recommendations:${userId}`,
    ]);
  }

  /**
   * Get current state for a user
   */
  getUserState(userId: string): {
    recentActivities: ActivityRecord[];
    currentSessions: ActivitySession[];
    engagementMetrics: EngagementMetrics | null;
    behaviorPatterns: BehaviorPattern[];
    activeInsights: ActivityInsight[];
    currentRecommendations: ActivityRecommendation[];
  } {
    return {
      recentActivities: this.state.recentActivities.get(userId) || [],
      currentSessions: Array.from(this.state.currentSessions.values()).filter(
        (s) => s.userId === userId,
      ),
      engagementMetrics: this.state.engagementMetrics.get(userId) || null,
      behaviorPatterns: this.state.behaviorPatterns.get(userId) || [],
      activeInsights: this.state.activeInsights.get(userId) || [],
      currentRecommendations:
        this.state.currentRecommendations.get(userId) || [],
    };
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    connected: boolean;
    monitoredUsers: number;
    totalActivities: number;
    activeInsights: number;
    activeRecommendations: number;
  } {
    return {
      connected: this.wsManager.isWebSocketConnected(),
      monitoredUsers: this.state.recentActivities.size,
      totalActivities: Array.from(this.state.recentActivities.values()).reduce(
        (sum, activities) => sum + activities.length,
        0,
      ),
      activeInsights: Array.from(this.state.activeInsights.values()).reduce(
        (sum, insights) => sum + insights.length,
        0,
      ),
      activeRecommendations: Array.from(
        this.state.currentRecommendations.values(),
      ).reduce((sum, recs) => sum + recs.length, 0),
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.engagementUpdateTimer) {
      clearInterval(this.engagementUpdateTimer);
      this.engagementUpdateTimer = null;
    }

    if (this.behaviorDetectionTimer) {
      clearInterval(this.behaviorDetectionTimer);
      this.behaviorDetectionTimer = null;
    }

    if (this.insightGenerationTimer) {
      clearInterval(this.insightGenerationTimer);
      this.insightGenerationTimer = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // Clear state
    this.state.recentActivities.clear();
    this.state.currentSessions.clear();
    this.state.engagementMetrics.clear();
    this.state.behaviorPatterns.clear();
    this.state.activeInsights.clear();
    this.state.currentRecommendations.clear();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleError(error: UserServiceError): void {
    console.error("[ActivityMonitoringManager] Error:", error);
    this.handlers.onError?.(error);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create activity monitoring manager
 */
export function createActivityMonitoringManager(
  wsManager: WebSocketManager,
  config?: ActivityMonitoringConfig,
): ActivityMonitoringManager {
  return new ActivityMonitoringManager(wsManager, config);
}

/**
 * Create mock activity monitoring manager for testing
 */
export function createMockActivityMonitoringManager(
  wsManager: WebSocketManager,
): ActivityMonitoringManager {
  return new ActivityMonitoringManager(wsManager, {
    enableRealTimeInsights: false,
    enableBehaviorDetection: false,
    enableEngagementTracking: false,
    enableRecommendationUpdates: false,
  });
}
