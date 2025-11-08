/**
 * Notification system using Server-Sent Events
 * Handles real-time notifications with identical behavior to Rails implementation
 */

export interface Notification {
  id: string;
  uuid: string;
  type:
    | "mentor_started_discussion"
    | "mentor_replied_to_discussion"
    | "student_replied_to_discussion"
    | "mentor_finished_discussion"
    | "acquired_badge"
    | "acquired_trophy"
    | "exercise_contributed_to"
    | "nudge_student"
    | "automated_feedback_added"
    | "approach_introduction_submitted"
    | "approach_introduction_approved"
    | "concept_contribution_approved"
    | "exercise_representation_published";
  url: string;
  text: string;
  imageType: "avatar" | "icon" | "exercise" | "track";
  imageUrl: string;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
  status: "pending" | "unread" | "read";
  links: {
    markAsRead: string;
    all: string;
  };
}

export interface NotificationSummary {
  count: number;
  unreadCount: number;
  links: {
    all: string;
  };
}

export type NotificationEventType =
  | "notification_created"
  | "notification_read"
  | "notification_deleted"
  | "notifications_marked_as_read"
  | "connection_established"
  | "connection_lost"
  | "error";

export interface NotificationEvent {
  type: NotificationEventType;
  data?: Record<string, unknown>;
  error?: Error;
  timestamp: string;
}

export type NotificationEventHandler = (event: NotificationEvent) => void;

export class NotificationSystem {
  private eventSource: EventSource | null = null;
  private eventHandlers: Map<
    NotificationEventType,
    Set<NotificationEventHandler>
  >;
  private notifications: Map<string, Notification> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private userId: string | null = null;

  constructor() {
    this.eventHandlers = new Map();

    // Initialize event handler sets
    const eventTypes: NotificationEventType[] = [
      "notification_created",
      "notification_read",
      "notification_deleted",
      "notifications_marked_as_read",
      "connection_established",
      "connection_lost",
      "error",
    ];
    eventTypes.forEach((type) => {
      this.eventHandlers.set(type, new Set());
    });
  }

  /**
   * Connect to notification stream
   */
  connect(userId: string): void {
    if (this.isConnected && this.userId === userId) {
      return;
    }

    this.disconnect();
    this.userId = userId;

    const streamUrl = this.buildStreamUrl(userId);

    try {
      this.eventSource = new EventSource(streamUrl, {
        withCredentials: true,
      });

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit("connection_established", {
          userId,
          timestamp: new Date().toISOString(),
        });
        console.log(`Notification stream connected for user: ${userId}`);
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.eventSource.onerror = (event) => {
        this.handleError(event);
      };

      // Handle specific notification events
      this.eventSource.addEventListener("notification", (event) => {
        this.handleNotificationEvent(event as MessageEvent);
      });

      this.eventSource.addEventListener("notification_read", (event) => {
        this.handleNotificationReadEvent(event as MessageEvent);
      });

      this.eventSource.addEventListener("notifications_summary", (event) => {
        this.handleNotificationsSummaryEvent(event as MessageEvent);
      });
    } catch (error) {
      console.error("Failed to connect to notification stream:", error);
      this.emit("error", {
        error: error as Error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Disconnect from notification stream
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnected = false;
    this.userId = null;

    this.emit("connection_lost", {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.isRead) {
      return;
    }

    try {
      const response = await fetch(notification.links.markAsRead, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      });

      if (response.ok) {
        // Update local state
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        notification.status = "read";

        this.notifications.set(notificationId, notification);

        this.emit("notification_read", {
          notification,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(
          `Failed to mark notification as read: ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      this.emit("error", {
        error: error as Error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    if (!this.userId) {
      throw new Error("Not connected to notification stream");
    }

    try {
      const response = await fetch("/api/notifications/mark_all_as_read", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      });

      if (response.ok) {
        // Update local state
        this.notifications.forEach((notification) => {
          if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = new Date().toISOString();
            notification.status = "read";
          }
        });

        this.emit("notifications_marked_as_read", {
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(
          `Failed to mark all notifications as read: ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      this.emit("error", {
        error: error as Error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return this.getNotifications().filter((n) => !n.isRead);
  }

  /**
   * Get notification count summary
   */
  getNotificationSummary(): NotificationSummary {
    const notifications = this.getNotifications();
    const unreadNotifications = notifications.filter((n) => !n.isRead);

    return {
      count: notifications.length,
      unreadCount: unreadNotifications.length,
      links: {
        all: "/notifications",
      },
    };
  }

  /**
   * Add event listener
   */
  on(event: NotificationEventType, handler: NotificationEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }

  /**
   * Remove event listener
   */
  off(event: NotificationEventType, handler: NotificationEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return (
      this.isConnected && this.eventSource?.readyState === EventSource.OPEN
    );
  }

  private buildStreamUrl(userId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    return `${baseUrl}/api/notifications/stream?user_id=${userId}`;
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log("Notification stream message:", data);
    } catch (error) {
      console.error("Error parsing notification stream message:", error);
    }
  }

  private handleNotificationEvent(event: MessageEvent): void {
    try {
      const notification: Notification = JSON.parse(event.data);

      // Store notification
      this.notifications.set(notification.id, notification);

      this.emit("notification_created", {
        notification,
        timestamp: new Date().toISOString(),
      });

      console.log("New notification received:", notification);
    } catch (error) {
      console.error("Error handling notification event:", error);
      this.emit("error", {
        error: error as Error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private handleNotificationReadEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      const notification = this.notifications.get(data.notificationId);

      if (notification) {
        notification.isRead = true;
        notification.readAt = data.readAt;
        notification.status = "read";

        this.notifications.set(notification.id, notification);

        this.emit("notification_read", {
          notification,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error handling notification read event:", error);
    }
  }

  private handleNotificationsSummaryEvent(event: MessageEvent): void {
    try {
      const summary = JSON.parse(event.data);
      console.log("Notifications summary updated:", summary);
    } catch (error) {
      console.error("Error handling notifications summary event:", error);
    }
  }

  private handleError(event: Event): void {
    console.error("Notification stream error:", event);
    this.isConnected = false;

    this.emit("connection_lost", {
      timestamp: new Date().toISOString(),
    });

    // Attempt to reconnect
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.userId) {
      console.error(
        "Max reconnection attempts reached for notification stream",
      );
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    );

    this.reconnectTimer = setTimeout(() => {
      console.log(
        `Attempting to reconnect notification stream (attempt ${this.reconnectAttempts})`,
      );
      this.connect(this.userId!);
    }, delay);
  }

  private emit(
    type: NotificationEventType,
    data?: Record<string, unknown>,
  ): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      const event: NotificationEvent = {
        type,
        timestamp: new Date().toISOString(),
        ...data,
      };

      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in ${type} event handler:`, error);
        }
      });
    }
  }
}

// Global notification system instance
export const globalNotificationSystem = new NotificationSystem();
