/**
 * React hooks for real-time functionality
 * Provides identical API to existing real-time functionality
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  DiscussionChannel,
  DiscussionEvent,
  DiscussionChannelData,
} from "./discussion-channel";
import {
  globalNotificationSystem,
  Notification,
  NotificationEvent,
  NotificationSummary,
} from "./notification-system";
import {
  ProgressChannel,
  ProgressUpdateEvent,
  MilestoneAchievedEvent,
  StreakUpdateEvent,
  ProgressSummaryUpdateEvent,
} from "./progress-channel";

/**
 * Hook for managing discussion channel connections
 */
export function useDiscussionChannel(discussionUuid: string) {
  const [channel, setChannel] = useState<DiscussionChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [posts, setPosts] = useState<
    Array<Record<string, unknown> & { uuid: string }>
  >([]);
  const [discussionData, setDiscussionData] =
    useState<DiscussionChannelData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<DiscussionChannel | null>(null);

  // Initialize channel
  useEffect(() => {
    if (!discussionUuid) return;

    const newChannel = new DiscussionChannel(discussionUuid);
    channelRef.current = newChannel;
    setChannel(newChannel);

    // Set up event handlers
    const handlePostCreated = (event: DiscussionEvent) => {
      const post = event.data.post as Record<string, unknown> & {
        uuid: string;
      };
      setPosts((prev) => [...prev, post]);
    };

    const handlePostUpdated = (event: DiscussionEvent) => {
      const updatedPost = event.data.post as Record<string, unknown> & {
        uuid: string;
      };
      setPosts((prev) =>
        prev.map((post) =>
          post.uuid === updatedPost.uuid ? updatedPost : post,
        ),
      );
    };

    const handlePostDeleted = (event: DiscussionEvent) => {
      const postUuid = event.data.postUuid as string;
      setPosts((prev) => prev.filter((post) => post.uuid !== postUuid));
    };

    const handleDiscussionFinished = () => {
      if (discussionData) {
        setDiscussionData({
          ...discussionData,
          discussion: {
            ...discussionData.discussion,
            status: "finished",
            isFinished: true,
          },
        });
      }
    };

    const handleStatusChanged = (event: DiscussionEvent) => {
      if (discussionData) {
        setDiscussionData({
          ...discussionData,
          discussion: {
            ...discussionData.discussion,
            status: event.data.status as
              | "finished"
              | "awaiting_mentor"
              | "awaiting_student"
              | "mentor_finished",
          },
        });
      }
    };

    newChannel.on("post_created", handlePostCreated);
    newChannel.on("post_updated", handlePostUpdated);
    newChannel.on("post_deleted", handlePostDeleted);
    newChannel.on("discussion_finished", handleDiscussionFinished);
    newChannel.on("status_changed", handleStatusChanged);

    // Subscribe to channel
    newChannel
      .subscribe()
      .then(() => {
        setIsConnected(true);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setIsConnected(false);
      });

    return () => {
      newChannel.off("post_created", handlePostCreated);
      newChannel.off("post_updated", handlePostUpdated);
      newChannel.off("post_deleted", handlePostDeleted);
      newChannel.off("discussion_finished", handleDiscussionFinished);
      newChannel.off("status_changed", handleStatusChanged);
      newChannel.unsubscribe();
    };
  }, [discussionUuid, discussionData]);

  // Methods for interacting with the discussion
  const sendPost = useCallback(
    (content: string, iterationIdx?: number) => {
      if (channel && isConnected) {
        channel.sendPost(content, iterationIdx);
      }
    },
    [channel, isConnected],
  );

  const updatePost = useCallback(
    (postUuid: string, content: string) => {
      if (channel && isConnected) {
        channel.updatePost(postUuid, content);
      }
    },
    [channel, isConnected],
  );

  const deletePost = useCallback(
    (postUuid: string) => {
      if (channel && isConnected) {
        channel.deletePost(postUuid);
      }
    },
    [channel, isConnected],
  );

  const finishDiscussion = useCallback(() => {
    if (channel && isConnected) {
      channel.finishDiscussion();
    }
  }, [channel, isConnected]);

  const startTyping = useCallback(() => {
    if (channel && isConnected) {
      channel.startTyping();
    }
  }, [channel, isConnected]);

  const stopTyping = useCallback(() => {
    if (channel && isConnected) {
      channel.stopTyping();
    }
  }, [channel, isConnected]);

  return {
    isConnected,
    posts,
    discussionData,
    error,
    sendPost,
    updatePost,
    deletePost,
    finishDiscussion,
    startTyping,
    stopTyping,
    channel,
  };
}

/**
 * Hook for managing notifications
 */
export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>({
    count: 0,
    unreadCount: 0,
    links: { all: "/notifications" },
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Connect to notification system
  useEffect(() => {
    if (!userId) return;

    const handleConnectionEstablished = () => {
      setIsConnected(true);
      setError(null);
      // Load initial notifications
      setNotifications(globalNotificationSystem.getNotifications());
      setSummary(globalNotificationSystem.getNotificationSummary());
    };

    const handleConnectionLost = () => {
      setIsConnected(false);
    };

    const handleNotificationCreated = (event: NotificationEvent) => {
      if (event.data?.notification) {
        const notification = event.data.notification as Notification;
        setNotifications((prev) => [notification, ...prev]);
        setSummary(globalNotificationSystem.getNotificationSummary());
      }
    };

    const handleNotificationRead = (event: NotificationEvent) => {
      if (event.data?.notification) {
        const readNotification = event.data.notification as Notification;
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === readNotification.id
              ? readNotification
              : notification,
          ),
        );
        setSummary(globalNotificationSystem.getNotificationSummary());
      }
    };

    const handleNotificationsMarkedAsRead = () => {
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: new Date().toISOString(),
          status: "read" as const,
        })),
      );
      setSummary(globalNotificationSystem.getNotificationSummary());
    };

    const handleError = (event: NotificationEvent) => {
      setError(event.error || new Error("Unknown notification error"));
    };

    // Set up event listeners
    globalNotificationSystem.on(
      "connection_established",
      handleConnectionEstablished,
    );
    globalNotificationSystem.on("connection_lost", handleConnectionLost);
    globalNotificationSystem.on(
      "notification_created",
      handleNotificationCreated,
    );
    globalNotificationSystem.on("notification_read", handleNotificationRead);
    globalNotificationSystem.on(
      "notifications_marked_as_read",
      handleNotificationsMarkedAsRead,
    );
    globalNotificationSystem.on("error", handleError);

    // Connect
    globalNotificationSystem.connect(userId);

    return () => {
      globalNotificationSystem.off(
        "connection_established",
        handleConnectionEstablished,
      );
      globalNotificationSystem.off("connection_lost", handleConnectionLost);
      globalNotificationSystem.off(
        "notification_created",
        handleNotificationCreated,
      );
      globalNotificationSystem.off("notification_read", handleNotificationRead);
      globalNotificationSystem.off(
        "notifications_marked_as_read",
        handleNotificationsMarkedAsRead,
      );
      globalNotificationSystem.off("error", handleError);
      globalNotificationSystem.disconnect();
    };
  }, [userId]);

  // Methods for interacting with notifications
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await globalNotificationSystem.markAsRead(notificationId);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await globalNotificationSystem.markAllAsRead();
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  return {
    notifications,
    summary,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    getUnreadNotifications,
  };
}

/**
 * Hook for managing typing indicators in discussions
 */
export function useTypingIndicator(discussionUuid: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [channel, setChannel] = useState<DiscussionChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!discussionUuid) return;

    const newChannel = new DiscussionChannel(discussionUuid);
    setChannel(newChannel);

    const handleTypingStarted = (event: DiscussionEvent) => {
      const userHandle = event.data.userHandle as string;
      if (userHandle) {
        setTypingUsers((prev) =>
          prev.includes(userHandle) ? prev : [...prev, userHandle],
        );
      }
    };

    const handleTypingStopped = (event: DiscussionEvent) => {
      const userHandle = event.data.userHandle as string;
      if (userHandle) {
        setTypingUsers((prev) =>
          prev.filter((handle) => handle !== userHandle),
        );
      }
    };

    newChannel.on("typing_started", handleTypingStarted);
    newChannel.on("typing_stopped", handleTypingStopped);

    newChannel.subscribe().catch(console.error);

    return () => {
      newChannel.off("typing_started", handleTypingStarted);
      newChannel.off("typing_stopped", handleTypingStopped);
      newChannel.unsubscribe();
    };
  }, [discussionUuid]);

  const startTyping = useCallback(() => {
    if (channel) {
      channel.startTyping();

      // Auto-stop typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        channel.stopTyping();
      }, 3000);
    }
  }, [channel]);

  const stopTyping = useCallback(() => {
    if (channel) {
      channel.stopTyping();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [channel]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}

/**
 * Hook for managing real-time connection status
 */
export function useRealtimeStatus() {
  const [discussionConnections, setDiscussionConnections] = useState<
    Map<string, boolean>
  >(new Map());
  const [notificationConnection, setNotificationConnection] = useState(false);
  const [overallStatus, setOverallStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");

  // Track discussion connection status
  const updateDiscussionConnection = useCallback(
    (discussionUuid: string, isConnected: boolean) => {
      setDiscussionConnections((prev) => {
        const newMap = new Map(prev);
        newMap.set(discussionUuid, isConnected);
        return newMap;
      });
    },
    [],
  );

  // Track notification connection status
  const updateNotificationConnection = useCallback((isConnected: boolean) => {
    setNotificationConnection(isConnected);
  }, []);

  // Calculate overall status
  useEffect(() => {
    const hasActiveDiscussions = Array.from(
      discussionConnections.values(),
    ).some(Boolean);

    if (notificationConnection || hasActiveDiscussions) {
      setOverallStatus("connected");
    } else if (discussionConnections.size > 0) {
      setOverallStatus("connecting");
    } else {
      setOverallStatus("disconnected");
    }
  }, [discussionConnections, notificationConnection]);

  return {
    discussionConnections: Object.fromEntries(discussionConnections),
    notificationConnection,
    overallStatus,
    updateDiscussionConnection,
    updateNotificationConnection,
  };
}

/**
 * Hook for managing real-time data synchronization
 */
export function useRealtimeSync<T>(
  _key: string,
  initialData: T,
  syncFunction?: (data: T) => Promise<T>,
) {
  const [data, setData] = useState<T>(initialData);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sync = useCallback(async () => {
    if (!syncFunction || isSyncing) return;

    setIsSyncing(true);
    setError(null);

    try {
      const syncedData = await syncFunction(data);
      setData(syncedData);
      setLastSync(new Date());
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSyncing(false);
    }
  }, [data, syncFunction, isSyncing]);

  // Auto-sync every 30 seconds
  useEffect(() => {
    const interval = setInterval(sync, 30000);
    return () => clearInterval(interval);
  }, [sync]);

  const updateData = useCallback((newData: T | ((prev: T) => T)) => {
    setData(newData);
  }, []);

  return {
    data,
    lastSync,
    isSyncing,
    error,
    sync,
    updateData,
  };
}

// Import the new channels
import {
  AIHelpRecordsChannel,
  AIHelpRecordsChannelResponse,
  IterationChannel,
  Iteration,
  LatestIterationStatusChannel,
  LatestIterationStatusResponse,
  MentorRequestChannel,
  MentorSessionRequest,
  MentorRequestChannelResponse,
  MetricsChannel,
  Metric,
  ReputationChannel,
  SolutionChannel,
  Solution,
  SolutionChannelResponse,
  SolutionWithLatestIterationChannel,
  SolutionWithLatestIterationResponse,
  TestRunChannel,
  TestRun,
} from "./channels";

/**
 * Hook for AI Help Records Channel
 */
export function useAIHelpRecords(submissionUuid: string) {
  const [channel, setChannel] = useState<AIHelpRecordsChannel | null>(null);
  const [helpRecords, setHelpRecords] = useState<
    AIHelpRecordsChannelResponse[]
  >([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!submissionUuid) return;

    const handleHelpRecord = (response: AIHelpRecordsChannelResponse) => {
      setHelpRecords((prev) => {
        const existing = prev.find((record) => record.uuid === response.uuid);
        if (existing) {
          return prev.map((record) =>
            record.uuid === response.uuid ? response : record,
          );
        }
        return [...prev, response];
      });
    };

    let newChannel: AIHelpRecordsChannel | null = null;

    try {
      newChannel = new AIHelpRecordsChannel(submissionUuid, handleHelpRecord);
      setChannel(newChannel);
      setIsConnected(newChannel.isActive());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, [submissionUuid]);

  return {
    helpRecords,
    isConnected,
    error,
    channel,
  };
}

/**
 * Hook for Iteration Channel
 */
export function useIteration(uuid: string) {
  const [channel, setChannel] = useState<IterationChannel | null>(null);
  const [iteration, setIteration] = useState<Iteration | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uuid) return;

    const handleIteration = (updatedIteration: Iteration) => {
      setIteration(updatedIteration);
    };

    let newChannel: IterationChannel | null = null;

    try {
      newChannel = new IterationChannel(uuid, handleIteration);
      setChannel(newChannel);
      setIsConnected(newChannel.isActive());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, [uuid]);

  return {
    iteration,
    isConnected,
    error,
    channel,
  };
}

/**
 * Hook for Latest Iteration Status Channel
 */
export function useLatestIterationStatus(uuid: string) {
  const [channel, setChannel] = useState<LatestIterationStatusChannel | null>(
    null,
  );
  const [status, setStatus] = useState<LatestIterationStatusResponse | null>(
    null,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uuid) return;

    const handleStatusUpdate = (response: LatestIterationStatusResponse) => {
      setStatus(response);
    };

    let newChannel: LatestIterationStatusChannel | null = null;

    try {
      newChannel = new LatestIterationStatusChannel(uuid, handleStatusUpdate);
      setChannel(newChannel);
      setIsConnected(newChannel.isActive());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, [uuid]);

  return {
    status,
    isConnected,
    error,
    channel,
  };
}

/**
 * Hook for Mentor Request Channel
 */
export function useMentorRequest(request: MentorSessionRequest) {
  const [channel, setChannel] = useState<MentorRequestChannel | null>(null);
  const [requestStatus, setRequestStatus] =
    useState<MentorRequestChannelResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!request?.uuid) return;

    const handleRequestUpdate = (response: MentorRequestChannelResponse) => {
      setRequestStatus(response);
    };

    let newChannel: MentorRequestChannel | null = null;

    try {
      newChannel = new MentorRequestChannel(request, handleRequestUpdate);
      setChannel(newChannel);
      setIsConnected(newChannel.isActive());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, [request?.uuid, request]);

  const cancelRequest = useCallback(() => {
    if (channel && isConnected) {
      channel.cancelRequest();
    }
  }, [channel, isConnected]);

  return {
    requestStatus,
    isConnected,
    error,
    cancelRequest,
    channel,
  };
}

/**
 * Hook for Metrics Channel
 */
export function useMetrics() {
  const [channel, setChannel] = useState<MetricsChannel | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleMetric = (metric: Metric) => {
      setMetrics((prev) => [metric, ...prev.slice(0, 99)]); // Keep last 100 metrics
    };

    let newChannel: MetricsChannel | null = null;

    try {
      newChannel = new MetricsChannel(handleMetric);
      setChannel(newChannel);
      setIsConnected(newChannel.isActive());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, []);

  const sendMetric = useCallback(
    (metric: Partial<Metric>) => {
      if (channel && isConnected) {
        channel.sendMetric(metric);
      }
    },
    [channel, isConnected],
  );

  return {
    metrics,
    isConnected,
    error,
    sendMetric,
    channel,
  };
}

/**
 * Hook for Reputation Channel
 */
export function useReputation() {
  const [channel, setChannel] = useState<ReputationChannel | null>(null);
  const [reputationUpdated, setReputationUpdated] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleReputationUpdate = () => {
      setReputationUpdated(true);
      // Reset after a short delay to allow UI to react
      setTimeout(() => setReputationUpdated(false), 1000);
    };

    let newChannel: ReputationChannel | null = null;

    try {
      newChannel = new ReputationChannel(handleReputationUpdate);
      setChannel(newChannel);
      setIsConnected(newChannel.isConnected());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, []);

  return {
    reputationUpdated,
    isConnected,
    error,
    channel,
  };
}

/**
 * Hook for Solution Channel
 */
export function useSolution(solution: Solution) {
  const [channel, setChannel] = useState<SolutionChannel | null>(null);
  const [solutionData, setSolutionData] =
    useState<SolutionChannelResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!solution?.uuid) return;

    const handleSolutionUpdate = (response: SolutionChannelResponse) => {
      setSolutionData(response);
    };

    let newChannel: SolutionChannel | null = null;

    try {
      newChannel = new SolutionChannel(solution, handleSolutionUpdate);
      setChannel(newChannel);
      setIsConnected(newChannel.isActive());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, [solution?.uuid, solution]);

  const publishSolution = useCallback(() => {
    if (channel && isConnected) {
      channel.publishSolution();
    }
  }, [channel, isConnected]);

  const unpublishSolution = useCallback(() => {
    if (channel && isConnected) {
      channel.unpublishSolution();
    }
  }, [channel, isConnected]);

  return {
    solutionData,
    isConnected,
    error,
    publishSolution,
    unpublishSolution,
    channel,
  };
}

/**
 * Hook for Solution With Latest Iteration Channel
 */
export function useSolutionWithLatestIteration(solution: Solution) {
  const [channel, setChannel] =
    useState<SolutionWithLatestIterationChannel | null>(null);
  const [solutionData, setSolutionData] =
    useState<SolutionWithLatestIterationResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!solution?.uuid) return;

    const handleSolutionUpdate = (
      response: SolutionWithLatestIterationResponse,
    ) => {
      setSolutionData(response);
    };

    let newChannel: SolutionWithLatestIterationChannel | null = null;

    try {
      newChannel = new SolutionWithLatestIterationChannel(
        solution,
        handleSolutionUpdate,
      );
      setChannel(newChannel);
      setIsConnected(newChannel.isActive());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, [solution?.uuid, solution]);

  return {
    solutionData,
    isConnected,
    error,
    channel,
  };
}

/**
 * Hook for Test Run Channel
 */
export function useTestRun(testRun: TestRun) {
  const [channel, setChannel] = useState<TestRunChannel | null>(null);
  const [testRunData, setTestRunData] = useState<TestRun | null>(testRun);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!testRun?.submissionUuid) return;

    const handleTestRunUpdate = (updatedTestRun: TestRun) => {
      setTestRunData(updatedTestRun);
    };

    let newChannel: TestRunChannel | null = null;

    try {
      newChannel = new TestRunChannel(testRun, handleTestRunUpdate);
      setChannel(newChannel);
      setIsConnected(newChannel.isActive());
    } catch (err) {
      setError(err as Error);
    }

    return () => {
      if (newChannel) {
        newChannel.disconnect();
      }
    };
  }, [testRun?.submissionUuid, testRun]);

  const cancelTestRun = useCallback(() => {
    if (channel && isConnected) {
      channel.cancelTestRun();
    }
  }, [channel, isConnected]);

  return {
    testRunData,
    isConnected,
    error,
    cancelTestRun,
    channel,
  };
}
/**

 * Hook for Progress Channel - Real-time progress updates
 */
export function useProgressUpdates(userId: string) {
  const [channel, setChannel] = useState<ProgressChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    isWebSocket: boolean;
    isPolling: boolean;
    reconnectAttempts: number;
  }>({
    isWebSocket: false,
    isPolling: false,
    reconnectAttempts: 0,
  });
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ProgressChannel | null>(null);

  // Event handlers
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdateEvent[]>(
    [],
  );
  const [milestoneAchievements, setMilestoneAchievements] = useState<
    MilestoneAchievedEvent[]
  >([]);
  const [streakUpdates, setStreakUpdates] = useState<StreakUpdateEvent[]>([]);
  const [summaryUpdates, setSummaryUpdates] = useState<
    ProgressSummaryUpdateEvent[]
  >([]);

  // Initialize channel
  useEffect(() => {
    if (!userId) return;

    const progressChannel = new ProgressChannel(userId, {
      onProgressUpdate: (event) => {
        setProgressUpdates((prev) => [...prev.slice(-9), event]); // Keep last 10 updates
      },

      onMilestoneAchieved: (event) => {
        setMilestoneAchievements((prev) => [...prev.slice(-4), event]); // Keep last 5 achievements
      },

      onStreakUpdate: (event) => {
        setStreakUpdates((prev) => [...prev.slice(-4), event]); // Keep last 5 streak updates
      },

      onProgressSummaryUpdate: (event) => {
        setSummaryUpdates((prev) => [...prev.slice(-2), event]); // Keep last 3 summary updates
      },

      onError: (error) => {
        setError(new Error(error.message));
      },
    });

    channelRef.current = progressChannel;
    setChannel(progressChannel);

    // Subscribe to updates
    progressChannel
      .subscribe()
      .then(() => {
        setIsConnected(true);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setIsConnected(false);
      });

    // Monitor connection status
    const statusInterval = setInterval(() => {
      if (progressChannel) {
        const status = progressChannel.getConnectionStatus();
        setIsConnected(status.connected);
        setConnectionStatus({
          isWebSocket: true, // Assuming WebSocket is primary transport
          isPolling: false, // Fallback to polling if WebSocket fails
          reconnectAttempts: status.reconnectAttempts,
        });
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(statusInterval);
      if (progressChannel) {
        progressChannel.unsubscribe();
      }
    };
  }, [userId]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current
        .subscribe()
        .then(() => {
          setIsConnected(true);
          setError(null);
        })
        .catch((err) => {
          setError(err);
          setIsConnected(false);
        });
    }
  }, []);

  // Clear specific event history
  const clearProgressUpdates = useCallback(() => setProgressUpdates([]), []);
  const clearMilestoneAchievements = useCallback(
    () => setMilestoneAchievements([]),
    [],
  );
  const clearStreakUpdates = useCallback(() => setStreakUpdates([]), []);
  const clearSummaryUpdates = useCallback(() => setSummaryUpdates([]), []);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    error,

    // Event data
    progressUpdates,
    milestoneAchievements,
    streakUpdates,
    summaryUpdates,

    // Actions
    reconnect,
    clearProgressUpdates,
    clearMilestoneAchievements,
    clearStreakUpdates,
    clearSummaryUpdates,

    // Channel reference for advanced usage
    channel,
  };
}
