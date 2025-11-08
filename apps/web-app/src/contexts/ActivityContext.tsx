"use client";

/**
 * Activity Monitoring Context with Comprehensive Activity State Management
 *
 * Implements:
 * - ActivityContext with comprehensive activity state management
 * - Automatic activity recording with batching for performance
 * - Session management with start/end tracking
 * - Activity metadata collection and enrichment
 * - Requirements: 4.1, 4.2, 4.5, 10.1
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { userServiceClient } from "@/lib/user-service";
import {
  getUserServiceCacheManager,
  queryKeys,
  CACHE_TIMES,
  createUserServiceQueryOptions,
} from "@/lib/cache/user-service-cache";
import type {
  ActivityRecord,
  ActivitySummary,
  EngagementMetrics,
  ActivityInsight,
  ActivityRecommendation,
  ActivityType,
  UserServiceError,
  DateRange,
  BehaviorPattern,
  TopicActivitySummary,
} from "@/types/user-service";

// ============================================================================
// Activity State Types
// ============================================================================

export interface ActivityState {
  // Activity data
  summary: ActivitySummary | null;
  engagementMetrics: EngagementMetrics | null;
  insights: ActivityInsight[];
  recommendations: ActivityRecommendation[];
  recentActivities: ActivityRecord[];

  // Session management
  currentSession: ActivitySession | null;
  sessionHistory: ActivitySession[];

  // Loading states
  isLoading: boolean;
  isSummaryLoading: boolean;
  isMetricsLoading: boolean;
  isInsightsLoading: boolean;
  isRecording: boolean;

  // Error states
  error: UserServiceError | null;
  summaryError: UserServiceError | null;
  metricsError: UserServiceError | null;
  insightsError: UserServiceError | null;

  // Batching and performance
  pendingActivities: ActivityRecord[];
  batchingEnabled: boolean;
  lastBatchTime: Date | null;

  // Analytics cache
  behaviorPatterns: BehaviorPattern[];
  topicActivities: TopicActivitySummary[];

  // Real-time state
  isRealTimeEnabled: boolean;
  lastActivityTime: Date | null;
}

export interface ActivitySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  activities: ActivityRecord[];
  metadata: SessionMetadata;
  isActive: boolean;
}

export interface SessionMetadata {
  deviceType: "desktop" | "mobile" | "tablet";
  browserInfo: string;
  screenResolution: string;
  timezone: string;
  referrer?: string;
  userAgent: string;
}

// ============================================================================
// Action Types
// ============================================================================

export type ActivityAction =
  // Summary actions
  | { type: "SUMMARY_FETCH_START" }
  | { type: "SUMMARY_FETCH_SUCCESS"; payload: { summary: ActivitySummary } }
  | { type: "SUMMARY_FETCH_ERROR"; payload: { error: UserServiceError } }

  // Metrics actions
  | { type: "METRICS_FETCH_START" }
  | { type: "METRICS_FETCH_SUCCESS"; payload: { metrics: EngagementMetrics } }
  | { type: "METRICS_FETCH_ERROR"; payload: { error: UserServiceError } }

  // Insights actions
  | { type: "INSIGHTS_FETCH_START" }
  | {
      type: "INSIGHTS_FETCH_SUCCESS";
      payload: {
        insights: ActivityInsight[];
        recommendations: ActivityRecommendation[];
      };
    }
  | { type: "INSIGHTS_FETCH_ERROR"; payload: { error: UserServiceError } }

  // Activity recording actions
  | { type: "ACTIVITY_RECORD_START" }
  | { type: "ACTIVITY_RECORD_SUCCESS"; payload: { activity: ActivityRecord } }
  | { type: "ACTIVITY_RECORD_ERROR"; payload: { error: UserServiceError } }
  | { type: "ACTIVITY_BATCH_ADD"; payload: { activity: ActivityRecord } }
  | { type: "ACTIVITY_BATCH_FLUSH"; payload: { activities: ActivityRecord[] } }

  // Session management actions
  | { type: "SESSION_START"; payload: { session: ActivitySession } }
  | {
      type: "SESSION_END";
      payload: { sessionId: string; endTime: Date; duration: number };
    }
  | {
      type: "SESSION_UPDATE";
      payload: { sessionId: string; activity: ActivityRecord };
    }

  // Analytics actions
  | {
      type: "BEHAVIOR_PATTERNS_UPDATE";
      payload: { patterns: BehaviorPattern[] };
    }
  | {
      type: "TOPIC_ACTIVITIES_UPDATE";
      payload: { topicActivities: TopicActivitySummary[] };
    }

  // Configuration actions
  | { type: "BATCHING_TOGGLE"; payload: { enabled: boolean } }
  | { type: "REALTIME_TOGGLE"; payload: { enabled: boolean } }

  // Error management
  | {
      type: "CLEAR_ERROR";
      payload?: {
        errorType?: keyof Pick<
          ActivityState,
          "error" | "summaryError" | "metricsError" | "insightsError"
        >;
      };
    }
  | { type: "CLEAR_ALL_ERRORS" };

// ============================================================================
// Initial State
// ============================================================================

const initialState: ActivityState = {
  summary: null,
  engagementMetrics: null,
  insights: [],
  recommendations: [],
  recentActivities: [],

  currentSession: null,
  sessionHistory: [],

  isLoading: false,
  isSummaryLoading: false,
  isMetricsLoading: false,
  isInsightsLoading: false,
  isRecording: false,

  error: null,
  summaryError: null,
  metricsError: null,
  insightsError: null,

  pendingActivities: [],
  batchingEnabled: true,
  lastBatchTime: null,

  behaviorPatterns: [],
  topicActivities: [],

  isRealTimeEnabled: true,
  lastActivityTime: null,
};

// ============================================================================
// Reducer
// ============================================================================

function activityReducer(
  state: ActivityState,
  action: ActivityAction,
): ActivityState {
  switch (action.type) {
    // Summary
    case "SUMMARY_FETCH_START":
      return {
        ...state,
        isSummaryLoading: true,
        isLoading: true,
        summaryError: null,
      };

    case "SUMMARY_FETCH_SUCCESS":
      return {
        ...state,
        isSummaryLoading: false,
        isLoading: false,
        summary: action.payload.summary,
        summaryError: null,
        behaviorPatterns: action.payload.summary.behaviorPatterns,
        topicActivities: action.payload.summary.topTopics,
      };

    case "SUMMARY_FETCH_ERROR":
      return {
        ...state,
        isSummaryLoading: false,
        isLoading: false,
        summaryError: action.payload.error,
      };

    // Metrics
    case "METRICS_FETCH_START":
      return {
        ...state,
        isMetricsLoading: true,
        isLoading: true,
        metricsError: null,
      };

    case "METRICS_FETCH_SUCCESS":
      return {
        ...state,
        isMetricsLoading: false,
        isLoading: false,
        engagementMetrics: action.payload.metrics,
        metricsError: null,
      };

    case "METRICS_FETCH_ERROR":
      return {
        ...state,
        isMetricsLoading: false,
        isLoading: false,
        metricsError: action.payload.error,
      };

    // Insights
    case "INSIGHTS_FETCH_START":
      return {
        ...state,
        isInsightsLoading: true,
        isLoading: true,
        insightsError: null,
      };

    case "INSIGHTS_FETCH_SUCCESS":
      return {
        ...state,
        isInsightsLoading: false,
        isLoading: false,
        insights: action.payload.insights,
        recommendations: action.payload.recommendations,
        insightsError: null,
      };

    case "INSIGHTS_FETCH_ERROR":
      return {
        ...state,
        isInsightsLoading: false,
        isLoading: false,
        insightsError: action.payload.error,
      };

    // Activity recording
    case "ACTIVITY_RECORD_START":
      return {
        ...state,
        isRecording: true,
        error: null,
      };

    case "ACTIVITY_RECORD_SUCCESS":
      return {
        ...state,
        isRecording: false,
        recentActivities: [
          action.payload.activity,
          ...state.recentActivities,
        ].slice(0, 50),
        lastActivityTime: new Date(),
        error: null,
      };

    case "ACTIVITY_RECORD_ERROR":
      return {
        ...state,
        isRecording: false,
        error: action.payload.error,
      };

    case "ACTIVITY_BATCH_ADD":
      return {
        ...state,
        pendingActivities: [
          ...state.pendingActivities,
          action.payload.activity,
        ],
      };

    case "ACTIVITY_BATCH_FLUSH":
      return {
        ...state,
        pendingActivities: [],
        recentActivities: [
          ...action.payload.activities,
          ...state.recentActivities,
        ].slice(0, 50),
        lastBatchTime: new Date(),
        lastActivityTime: new Date(),
      };

    // Session management
    case "SESSION_START":
      return {
        ...state,
        currentSession: action.payload.session,
        sessionHistory: [action.payload.session, ...state.sessionHistory].slice(
          0,
          10,
        ),
      };

    case "SESSION_END":
      const updatedSession = state.currentSession
        ? {
            ...state.currentSession,
            endTime: action.payload.endTime,
            duration: action.payload.duration,
            isActive: false,
          }
        : null;

      return {
        ...state,
        currentSession: null,
        sessionHistory: updatedSession
          ? [
              updatedSession,
              ...state.sessionHistory.filter(
                (s) => s.id !== action.payload.sessionId,
              ),
            ].slice(0, 10)
          : state.sessionHistory,
      };

    case "SESSION_UPDATE":
      if (
        !state.currentSession ||
        state.currentSession.id !== action.payload.sessionId
      ) {
        return state;
      }

      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          activities: [
            ...state.currentSession.activities,
            action.payload.activity,
          ],
        },
      };

    // Analytics
    case "BEHAVIOR_PATTERNS_UPDATE":
      return {
        ...state,
        behaviorPatterns: action.payload.patterns,
      };

    case "TOPIC_ACTIVITIES_UPDATE":
      return {
        ...state,
        topicActivities: action.payload.topicActivities,
      };

    // Configuration
    case "BATCHING_TOGGLE":
      return {
        ...state,
        batchingEnabled: action.payload.enabled,
      };

    case "REALTIME_TOGGLE":
      return {
        ...state,
        isRealTimeEnabled: action.payload.enabled,
      };

    // Error management
    case "CLEAR_ERROR":
      if (action.payload?.errorType) {
        return {
          ...state,
          [action.payload.errorType]: null,
        };
      }
      return {
        ...state,
        error: null,
      };

    case "CLEAR_ALL_ERRORS":
      return {
        ...state,
        error: null,
        summaryError: null,
        metricsError: null,
        insightsError: null,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context Definition
// ============================================================================

export interface ActivityContextValue {
  // State
  state: ActivityState;

  // Computed properties
  summary: ActivitySummary | null;
  engagementMetrics: EngagementMetrics | null;
  insights: ActivityInsight[];
  recommendations: ActivityRecommendation[];
  currentSession: ActivitySession | null;
  isLoading: boolean;
  isRecording: boolean;
  error: UserServiceError | null;

  // Activity recording
  recordActivity: (
    activityType: ActivityType,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
  recordBatchActivities: (
    userId: string,
    activities: Omit<ActivityRecord, "id" | "timestamp">[],
  ) => Promise<void>;

  // Session management
  startSession: () => Promise<ActivitySession>;
  endSession: () => Promise<void>;
  getCurrentSessionDuration: () => number;

  // Data fetching
  fetchActivitySummary: (dateRange?: DateRange) => Promise<void>;
  fetchEngagementMetrics: (dateRange?: DateRange) => Promise<void>;
  fetchInsightsAndRecommendations: () => Promise<void>;

  // Analytics and insights (Task 7.2)
  calculateEngagementTrends: (days: number) => Promise<EngagementTrend[]>;
  detectBehaviorPatterns: () => Promise<BehaviorPattern[]>;
  generatePersonalizedInsights: () => Promise<ActivityInsight[]>;
  getActivityRecommendations: () => Promise<ActivityRecommendation[]>;

  // Activity analytics and reporting (Task 7.3)
  generateActivityReport: (dateRange: DateRange) => Promise<ActivityReport>;
  getUsageAnalytics: () => Promise<UsageAnalytics>;
  exportActivityData: (format: "json" | "csv") => Promise<string>;

  // Performance optimization (Task 7.4)
  enableBatching: (enabled: boolean) => void;
  flushPendingActivities: () => Promise<void>;
  optimizeActivityRecording: () => void;

  // Utility functions
  clearError: (
    errorType?: keyof Pick<
      ActivityState,
      "error" | "summaryError" | "metricsError" | "insightsError"
    >,
  ) => void;
  clearAllErrors: () => void;
  getActivityCount: (activityType?: ActivityType) => number;
  getSessionStats: () => SessionStats;
}

// ============================================================================
// Additional Types for Context
// ============================================================================

export interface EngagementTrend {
  date: Date;
  engagementScore: number;
  activityCount: number;
  sessionDuration: number;
  topActivities: ActivityType[];
}

export interface ActivityReport {
  dateRange: DateRange;
  totalActivities: number;
  uniqueDays: number;
  averageSessionDuration: number;
  topActivities: { type: ActivityType; count: number }[];
  engagementTrends: EngagementTrend[];
  behaviorInsights: string[];
  recommendations: string[];
  generatedAt: Date;
}

export interface UsageAnalytics {
  dailyActiveUsers: number;
  averageSessionsPerUser: number;
  mostActiveHours: number[];
  topFeatures: string[];
  retentionRate: number;
  engagementScore: number;
}

export interface SessionStats {
  totalSessions: number;
  averageDuration: number;
  longestSession: number;
  shortestSession: number;
  activeSessions: number;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface ActivityProviderProps {
  children: ReactNode;
}

export function ActivityProvider({ children }: ActivityProviderProps) {
  const [state, dispatch] = useReducer(activityReducer, initialState);
  const { user: authUser, isAuthenticated } = useAuth();

  const userId = authUser?.id?.toString();

  // Batching timer ref
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const BATCH_INTERVAL = 5000; // 5 seconds
  const BATCH_SIZE = 10; // Maximum activities per batch

  // ============================================================================
  // React Query Integration
  // ============================================================================

  // Activity summary query
  const activitySummaryQuery = useQuery<ActivitySummary, UserServiceError>({
    queryKey: queryKeys.activitySummary(userId || "", "last-30-days"),
    queryFn: () =>
      userServiceClient.getActivitySummary(userId!, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date(),
      }),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<ActivitySummary, UserServiceError>(
      CACHE_TIMES.ACTIVITY_SUMMARY,
    ),
  });

  // Engagement metrics query
  const engagementMetricsQuery = useQuery<EngagementMetrics, UserServiceError>({
    queryKey: queryKeys.engagementMetrics(userId || "", 30),
    queryFn: () =>
      userServiceClient.getEngagementMetrics(userId!, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<EngagementMetrics, UserServiceError>(
      CACHE_TIMES.ENGAGEMENT_METRICS,
    ),
  });

  // Activity insights query
  const activityInsightsQuery = useQuery<
    { insights: ActivityInsight[]; recommendations: ActivityRecommendation[] },
    UserServiceError
  >({
    queryKey: queryKeys.activityInsights(userId || ""),
    queryFn: async () => {
      const [insights, recommendations] = await Promise.all([
        userServiceClient.getActivityInsights(userId!),
        userServiceClient.getActivityRecommendations(userId!),
      ]);
      return { insights, recommendations };
    },
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<
      {
        insights: ActivityInsight[];
        recommendations: ActivityRecommendation[];
      },
      UserServiceError
    >(CACHE_TIMES.ACTIVITY_INSIGHTS),
  });

  // Activity recording mutation
  const recordActivityMutation = useMutation({
    mutationFn: async (activity: Omit<ActivityRecord, "id" | "timestamp">) => {
      if (!userId) throw new Error("User not authenticated");
      const fullActivity: ActivityRecord = {
        ...activity,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      await userServiceClient.recordActivity(fullActivity);
      return fullActivity;
    },
    onMutate: () => {
      dispatch({ type: "ACTIVITY_RECORD_START" });
    },
    onSuccess: (activity: ActivityRecord) => {
      dispatch({
        type: "ACTIVITY_RECORD_SUCCESS",
        payload: { activity },
      });

      // Update current session
      if (state.currentSession) {
        dispatch({
          type: "SESSION_UPDATE",
          payload: { sessionId: state.currentSession.id, activity },
        });
      }

      // Invalidate related caches
      const cacheManager = getUserServiceCacheManager();
      cacheManager.invalidateActivity(userId!).catch(console.warn);
    },
    onError: (error: UserServiceError) => {
      dispatch({
        type: "ACTIVITY_RECORD_ERROR",
        payload: { error },
      });
    },
  });

  // ============================================================================
  // Effects for data synchronization
  // ============================================================================

  // Sync loading states
  useEffect(() => {
    if (activitySummaryQuery.isLoading && !state.isSummaryLoading) {
      dispatch({ type: "SUMMARY_FETCH_START" });
    }
    if (engagementMetricsQuery.isLoading && !state.isMetricsLoading) {
      dispatch({ type: "METRICS_FETCH_START" });
    }
    if (activityInsightsQuery.isLoading && !state.isInsightsLoading) {
      dispatch({ type: "INSIGHTS_FETCH_START" });
    }
  }, [
    activitySummaryQuery.isLoading,
    engagementMetricsQuery.isLoading,
    activityInsightsQuery.isLoading,
    state.isSummaryLoading,
    state.isMetricsLoading,
    state.isInsightsLoading,
  ]);

  // Sync successful data fetches
  useEffect(() => {
    if (activitySummaryQuery.data && !activitySummaryQuery.isLoading) {
      dispatch({
        type: "SUMMARY_FETCH_SUCCESS",
        payload: { summary: activitySummaryQuery.data },
      });
    }
  }, [activitySummaryQuery.data, activitySummaryQuery.isLoading]);

  useEffect(() => {
    if (engagementMetricsQuery.data && !engagementMetricsQuery.isLoading) {
      dispatch({
        type: "METRICS_FETCH_SUCCESS",
        payload: { metrics: engagementMetricsQuery.data },
      });
    }
  }, [engagementMetricsQuery.data, engagementMetricsQuery.isLoading]);

  useEffect(() => {
    if (activityInsightsQuery.data && !activityInsightsQuery.isLoading) {
      dispatch({
        type: "INSIGHTS_FETCH_SUCCESS",
        payload: {
          insights: activityInsightsQuery.data.insights,
          recommendations: activityInsightsQuery.data.recommendations,
        },
      });
    }
  }, [activityInsightsQuery.data, activityInsightsQuery.isLoading]);

  // Sync errors
  useEffect(() => {
    if (activitySummaryQuery.error && !activitySummaryQuery.isLoading) {
      dispatch({
        type: "SUMMARY_FETCH_ERROR",
        payload: { error: activitySummaryQuery.error },
      });
    }
  }, [activitySummaryQuery.error, activitySummaryQuery.isLoading]);

  useEffect(() => {
    if (engagementMetricsQuery.error && !engagementMetricsQuery.isLoading) {
      dispatch({
        type: "METRICS_FETCH_ERROR",
        payload: { error: engagementMetricsQuery.error },
      });
    }
  }, [engagementMetricsQuery.error, engagementMetricsQuery.isLoading]);

  useEffect(() => {
    if (activityInsightsQuery.error && !activityInsightsQuery.isLoading) {
      dispatch({
        type: "INSIGHTS_FETCH_ERROR",
        payload: { error: activityInsightsQuery.error },
      });
    }
  }, [activityInsightsQuery.error, activityInsightsQuery.isLoading]);

  // ============================================================================
  // Batching Logic (Task 7.4)
  // ============================================================================

  // Batch record activities
  const recordBatchActivities = useCallback(
    async (
      userId: string,
      activities: Omit<ActivityRecord, "id" | "timestamp">[]
    ): Promise<void> => {
      if (!userId || activities.length === 0) return;

      try {
        // Record each activity
        for (const activity of activities) {
          await recordActivityMutation.mutateAsync(activity);
        }
      } catch (error) {
        console.error("Failed to record batch activities:", error);
        throw error;
      }
    },
    [recordActivityMutation],
  );

  const flushPendingActivities = useCallback(async () => {
    if (state.pendingActivities.length === 0) return;

    const activitiesToFlush = state.pendingActivities.map((activity) => ({
      userId: activity.userId,
      activityType: activity.activityType,
      deviceType: activity.deviceType,
      appVersion: activity.appVersion,
      platform: activity.platform,
      userAgent: activity.userAgent,
      ipAddress: activity.ipAddress,
      metadata: activity.metadata,
    }));

    if (userId) {
      await recordBatchActivities(userId, activitiesToFlush);
    }
  }, [state.pendingActivities, userId, recordBatchActivities]);

  // Setup batching timer
  useEffect(() => {
    if (state.batchingEnabled && state.pendingActivities.length > 0) {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }

      batchTimerRef.current = setTimeout(() => {
        flushPendingActivities();
      }, BATCH_INTERVAL);
    }

    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, [
    state.batchingEnabled,
    state.pendingActivities.length,
    flushPendingActivities,
  ]);

  // Flush when batch size is reached
  useEffect(() => {
    if (state.pendingActivities.length >= BATCH_SIZE) {
      flushPendingActivities();
    }
  }, [state.pendingActivities.length, flushPendingActivities]);

  // ============================================================================
  // Activity Recording
  // ============================================================================

  const recordActivity = useCallback(
    async (
      activityType: ActivityType,
      metadata: Record<string, unknown> = {},
    ) => {
      if (!userId) return;

      const activity: Omit<ActivityRecord, "id" | "timestamp"> = {
        userId,
        activityType,
        deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
          ? "mobile"
          : "desktop",
        appVersion: "1.0.0",
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        ipAddress: "0.0.0.0", // Will be set by server
        metadata: {
          ...metadata,
          sessionId: state.currentSession?.id,
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      };

      if (state.batchingEnabled) {
        // Add to batch
        dispatch({
          type: "ACTIVITY_BATCH_ADD",
          payload: {
            activity: {
              ...activity,
              id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date(),
            },
          },
        });
      } else {
        // Record immediately
        await recordActivityMutation.mutateAsync(activity);
      }
    },
    [
      userId,
      state.currentSession,
      state.batchingEnabled,
      recordActivityMutation,
    ],
  );

  // ============================================================================
  // Session Management
  // ============================================================================

  const generateSessionMetadata = useCallback((): SessionMetadata => {
    return {
      deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
        ? "mobile"
        : "desktop",
      browserInfo: navigator.userAgent.split(" ").slice(-2).join(" "),
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer || "",
      userAgent: navigator.userAgent,
    };
  }, []);

  const startSession = useCallback(async (): Promise<ActivitySession> => {
    if (!userId) throw new Error("User not authenticated");

    const session: ActivitySession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startTime: new Date(),
      activities: [],
      metadata: generateSessionMetadata(),
      isActive: true,
    };

    dispatch({ type: "SESSION_START", payload: { session } });

    // Record session start activity
    await recordActivity("session_start", { sessionId: session.id });

    return session;
  }, [userId, generateSessionMetadata, recordActivity]);

  const endSession = useCallback(async () => {
    if (!state.currentSession) return;

    const endTime = new Date();
    const duration =
      endTime.getTime() - state.currentSession.startTime.getTime();

    // Record session end activity
    await recordActivity("session_end", {
      sessionId: state.currentSession.id,
      duration,
    });

    dispatch({
      type: "SESSION_END",
      payload: {
        sessionId: state.currentSession.id,
        endTime,
        duration,
      },
    });
  }, [state.currentSession, recordActivity]);

  const getCurrentSessionDuration = useCallback((): number => {
    if (!state.currentSession) return 0;
    return new Date().getTime() - state.currentSession.startTime.getTime();
  }, [state.currentSession]);

  // Auto-start session when user is authenticated
  useEffect(() => {
    if (userId && isAuthenticated && !state.currentSession) {
      startSession().catch(console.warn);
    }
  }, [userId, isAuthenticated, state.currentSession, startSession]);

  // Auto-end session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state.currentSession) {
        endSession();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.currentSession, endSession]);

  // ============================================================================
  // Activity Recording Functions (Task 7.1)
  // ============================================================================

  // ============================================================================
  // Data Fetching Functions
  // ============================================================================

  const fetchActivitySummary = useCallback(
    async (dateRange?: DateRange) => {
      if (!userId) return;

      try {
        if (dateRange) {
          // Fetch with custom date range
          const summary = await userServiceClient.getActivitySummary(
            userId,
            dateRange,
          );
          dispatch({ type: "SUMMARY_FETCH_SUCCESS", payload: { summary } });
        } else {
          // Use React Query refetch
          await activitySummaryQuery.refetch();
        }
      } catch (error) {
        dispatch({
          type: "SUMMARY_FETCH_ERROR",
          payload: { error: error as UserServiceError },
        });
      }
    },
    [userId, activitySummaryQuery],
  );

  const fetchEngagementMetrics = useCallback(
    async (dateRange?: DateRange) => {
      if (!userId) return;

      try {
        if (dateRange) {
          // Fetch with custom date range
          const metrics = await userServiceClient.getEngagementMetrics(
            userId,
            dateRange,
          );
          dispatch({ type: "METRICS_FETCH_SUCCESS", payload: { metrics } });
        } else {
          // Use React Query refetch
          await engagementMetricsQuery.refetch();
        }
      } catch (error) {
        dispatch({
          type: "METRICS_FETCH_ERROR",
          payload: { error: error as UserServiceError },
        });
      }
    },
    [userId, engagementMetricsQuery],
  );

  const fetchInsightsAndRecommendations = useCallback(async () => {
    if (!userId) return;
    await activityInsightsQuery.refetch();
  }, [userId, activityInsightsQuery]);

  // ============================================================================
  // Analytics and Insights Functions (Task 7.2)
  // ============================================================================

  const calculateEngagementTrends = useCallback(
    async (days: number): Promise<EngagementTrend[]> => {
      if (!userId || !state.summary) return [];

      try {
        // Import analytics utilities
        const { ActivityAnalyticsManager } = await import(
          "@/lib/user-service/activity-analytics"
        );

        const trends = await ActivityAnalyticsManager.calculateEngagementTrends(
          userId,
          days,
          state.summary,
          state.engagementMetrics,
        );

        return trends;
      } catch (error) {
        console.warn("Failed to calculate engagement trends:", error);
        return [];
      }
    },
    [userId, state.summary, state.engagementMetrics],
  );

  const detectBehaviorPatterns = useCallback(async (): Promise<
    BehaviorPattern[]
  > => {
    if (!userId || !state.summary) return [];

    try {
      const { BehaviorPatternAnalyzer } = await import(
        "@/lib/user-service/activity-analytics"
      );

      const patterns = await BehaviorPatternAnalyzer.detectPatterns(
        state.summary,
        state.recentActivities,
        state.sessionHistory,
      );

      dispatch({ type: "BEHAVIOR_PATTERNS_UPDATE", payload: { patterns } });
      return patterns;
    } catch (error) {
      console.warn("Failed to detect behavior patterns:", error);
      return [];
    }
  }, [userId, state.summary, state.recentActivities, state.sessionHistory]);

  const generatePersonalizedInsights = useCallback(async (): Promise<
    ActivityInsight[]
  > => {
    if (!userId || !state.summary) return [];

    try {
      const { PersonalizedInsightsGenerator } = await import(
        "@/lib/user-service/activity-analytics"
      );

      const insights = await PersonalizedInsightsGenerator.generateInsights(
        userId,
        state.summary,
        state.engagementMetrics,
        state.behaviorPatterns,
      );

      return insights;
    } catch (error) {
      console.warn("Failed to generate personalized insights:", error);
      return [];
    }
  }, [userId, state.summary, state.engagementMetrics, state.behaviorPatterns]);

  const getActivityRecommendations = useCallback(async (): Promise<
    ActivityRecommendation[]
  > => {
    if (!userId || !state.summary) return [];

    try {
      const { ActivityRecommendationEngine } = await import(
        "@/lib/user-service/activity-analytics"
      );

      const recommendations =
        await ActivityRecommendationEngine.generateRecommendations(
          userId,
          state.summary,
          state.insights,
          state.behaviorPatterns,
        );

      return recommendations;
    } catch (error) {
      console.warn("Failed to get activity recommendations:", error);
      return [];
    }
  }, [userId, state.summary, state.insights, state.behaviorPatterns]);

  // ============================================================================
  // Activity Analytics and Reporting Functions (Task 7.3)
  // ============================================================================

  const generateActivityReport = useCallback(
    async (dateRange: DateRange): Promise<ActivityReport> => {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      try {
        const { ActivityReportGenerator } = await import(
          "@/lib/user-service/activity-analytics"
        );

        const report = await ActivityReportGenerator.generateReport(
          userId,
          dateRange,
          state.summary,
          state.engagementMetrics,
          state.behaviorPatterns,
        );

        return report;
      } catch (error) {
        console.error("Failed to generate activity report:", error);
        throw error;
      }
    },
    [userId, state.summary, state.engagementMetrics, state.behaviorPatterns],
  );

  const getUsageAnalytics = useCallback(async (): Promise<UsageAnalytics> => {
    if (!userId || !state.summary) {
      return {
        dailyActiveUsers: 0,
        averageSessionsPerUser: 0,
        mostActiveHours: [],
        topFeatures: [],
        retentionRate: 0,
        engagementScore: 0,
      };
    }

    try {
      const { UsageAnalyticsCalculator } = await import(
        "@/lib/user-service/activity-analytics"
      );

      const analytics = await UsageAnalyticsCalculator.calculateUsageAnalytics(
        state.summary,
        state.engagementMetrics,
        state.sessionHistory,
      );

      return analytics;
    } catch (error) {
      console.warn("Failed to get usage analytics:", error);
      return {
        dailyActiveUsers: 0,
        averageSessionsPerUser: 0,
        mostActiveHours: [],
        topFeatures: [],
        retentionRate: 0,
        engagementScore: 0,
      };
    }
  }, [userId, state.summary, state.engagementMetrics, state.sessionHistory]);

  const exportActivityData = useCallback(
    async (format: "json" | "csv"): Promise<string> => {
      if (!userId || !state.summary) {
        throw new Error("No activity data to export");
      }

      try {
        const { ActivityDataExporter } = await import(
          "@/lib/user-service/activity-analytics"
        );

        const exportData = await ActivityDataExporter.exportData(
          format,
          state.summary,
          state.recentActivities,
          state.sessionHistory,
          state.engagementMetrics,
        );

        return exportData;
      } catch (error) {
        console.error("Failed to export activity data:", error);
        throw error;
      }
    },
    [
      userId,
      state.summary,
      state.recentActivities,
      state.sessionHistory,
      state.engagementMetrics,
    ],
  );

  // ============================================================================
  // Performance Optimization Functions (Task 7.4)
  // ============================================================================

  const enableBatching = useCallback(
    (enabled: boolean) => {
      dispatch({ type: "BATCHING_TOGGLE", payload: { enabled } });

      if (!enabled && state.pendingActivities.length > 0) {
        // Flush immediately when disabling batching
        flushPendingActivities();
      }
    },
    [state.pendingActivities.length, flushPendingActivities],
  );

  const optimizeActivityRecording = useCallback(() => {
    // Implement activity recording optimizations
    console.log("Optimizing activity recording...");

    // Enable batching if many activities are being recorded
    if (state.recentActivities.length > 20 && !state.batchingEnabled) {
      enableBatching(true);
    }

    // Reduce batch interval for high activity users
    if (state.recentActivities.length > 50) {
      // This would be implemented with a more sophisticated batching strategy
      console.log("High activity user detected - optimizing batch strategy");
    }
  }, [state.recentActivities.length, state.batchingEnabled, enableBatching]);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const clearError = useCallback(
    (
      errorType?: keyof Pick<
        ActivityState,
        "error" | "summaryError" | "metricsError" | "insightsError"
      >,
    ) => {
      if (errorType) {
        dispatch({ type: "CLEAR_ERROR", payload: { errorType } });
      } else {
        dispatch({ type: "CLEAR_ERROR" });
      }
    },
    [],
  );

  const clearAllErrors = useCallback(() => {
    dispatch({ type: "CLEAR_ALL_ERRORS" });
  }, []);

  const getActivityCount = useCallback(
    (activityType?: ActivityType): number => {
      if (!activityType) {
        return state.recentActivities.length;
      }
      return state.recentActivities.filter(
        (a) => a.activityType === activityType,
      ).length;
    },
    [state.recentActivities],
  );

  const getSessionStats = useCallback((): SessionStats => {
    const sessions = [state.currentSession, ...state.sessionHistory].filter(
      Boolean,
    ) as ActivitySession[];

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageDuration: 0,
        longestSession: 0,
        shortestSession: 0,
        activeSessions: 0,
      };
    }

    const durations = sessions
      .filter((s) => s.duration !== undefined)
      .map((s) => s.duration!);

    return {
      totalSessions: sessions.length,
      averageDuration:
        durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0,
      longestSession: durations.length > 0 ? Math.max(...durations) : 0,
      shortestSession: durations.length > 0 ? Math.min(...durations) : 0,
      activeSessions: sessions.filter((s) => s.isActive).length,
    };
  }, [state.currentSession, state.sessionHistory]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: ActivityContextValue = {
    // State
    state,

    // Computed properties
    summary:
      state.summary || (activitySummaryQuery.data as ActivitySummary) || null,
    engagementMetrics:
      state.engagementMetrics ||
      (engagementMetricsQuery.data as EngagementMetrics) ||
      null,
    insights: state.insights,
    recommendations: state.recommendations,
    currentSession: state.currentSession,
    isLoading:
      state.isLoading ||
      activitySummaryQuery.isLoading ||
      engagementMetricsQuery.isLoading ||
      activityInsightsQuery.isLoading,
    isRecording: state.isRecording || recordActivityMutation.isPending,
    error:
      state.error ||
      state.summaryError ||
      state.metricsError ||
      state.insightsError,

    // Activity recording
    recordActivity,
    recordBatchActivities,

    // Session management
    startSession,
    endSession,
    getCurrentSessionDuration,

    // Data fetching
    fetchActivitySummary,
    fetchEngagementMetrics,
    fetchInsightsAndRecommendations,

    // Analytics and insights (Task 7.2)
    calculateEngagementTrends,
    detectBehaviorPatterns,
    generatePersonalizedInsights,
    getActivityRecommendations,

    // Activity analytics and reporting (Task 7.3)
    generateActivityReport,
    getUsageAnalytics,
    exportActivityData,

    // Performance optimization (Task 7.4)
    enableBatching,
    flushPendingActivities,
    optimizeActivityRecording,

    // Utility functions
    clearError,
    clearAllErrors,
    getActivityCount,
    getSessionStats,
  };

  return (
    <ActivityContext.Provider value={contextValue}>
      {children}
    </ActivityContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useActivity(): ActivityContextValue {
  const context = useContext(ActivityContext);

  if (!context) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }

  return context;
}
