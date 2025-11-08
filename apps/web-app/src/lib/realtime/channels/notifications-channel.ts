/**
 * NotificationsChannel for real-time notification updates
 * Handles user notifications with connection management
 */

import { RealtimeConnection } from "../connection";
import { globalConnectionPool } from "../connection-pool";

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  url?: string;
}

export interface NotificationsChannelData {
  notifications: NotificationData[];
  unreadCount: number;
}

export type NotificationEventType =
  | "notification_received"
  | "notification_read"
  | "notification_updated";

export interface NotificationEvent {
  type: NotificationEventType;
  data: NotificationData;
  timestamp: string;
}

export type NotificationEventHandler = (data: NotificationsChannelData) => void;

export class NotificationsChannel {
  private connection: RealtimeConnection | null = null;
  private subscriberId: string;
  private onReceive: NotificationEventHandler;
  private isSubscribed = false;
  private identifier: string;
  private data: NotificationsChannelData;

  constructor(onReceive: NotificationEventHandler) {
    this.onReceive = onReceive;
    this.subscriberId = `notifications_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.identifier = JSON.stringify({ channel: "NotificationsChannel" });
    this.data = this.getInitialData();

    this.subscribe();
  }

  private getInitialData(): NotificationsChannelData {
    return {
      notifications: [],
      unreadCount: 0,
    };
  }

  /**
   * Subscribe to the notifications channel
   */
  private async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      return;
    }

    const wsUrl = this.buildWebSocketUrl();

    try {
      // Check if connection pool is ready
      if (!this.isConnectionPoolReady()) {
        console.error("Connection pool not available for NotificationsChannel");
        return;
      }

      this.connection = await globalConnectionPool.getConnection(
        wsUrl,
        this.subscriberId,
        {
          reconnectInterval: 1000,
          maxReconnectAttempts: 10,
          heartbeatInterval: 30000,
        },
      );

      this.setupConnectionHandlers();

      // Send subscription message (ActionCable format)
      this.connection.send({
        command: "subscribe",
        identifier: this.identifier,
      });

      this.isSubscribed = true;
      console.log("Subscribed to notifications channel");
    } catch (error) {
      console.error("Failed to subscribe to notifications channel:", error);
      this.connection = null;
    }
  }

  /**
   * Disconnect from the channel
   */
  disconnect(): void {
    try {
      if (!this.connection) {
        console.warn("No NotificationsChannel subscription to disconnect");
        return;
      }

      if (!this.isConnectionPoolReady()) {
        console.warn("Connection pool not available for disconnect");
        return;
      }

      // Send unsubscription message
      this.connection.send({
        command: "unsubscribe",
        identifier: this.identifier,
      });

      globalConnectionPool.releaseConnection(
        this.buildWebSocketUrl(),
        this.subscriberId,
      );
    } catch (error) {
      console.error("Error disconnecting NotificationsChannel:", error);
    } finally {
      this.connection = null;
      this.isSubscribed = false;
      console.log("Disconnected from notifications channel");
    }
  }

  /**
   * Check if channel is connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.isSubscribed;
  }

  /**
   * Check if channel is active
   */
  isActive(): boolean {
    return this.isSubscribed && this.connection?.isReady() === true;
  }

  /**
   * Get current notifications data
   */
  getData(): NotificationsChannelData {
    return { ...this.data };
  }

  markAsRead(notificationId: string): void {
    this.updateData((current: NotificationsChannelData) => ({
      ...current,
      notifications: current.notifications.map(
        (notification: NotificationData) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
      ),
      unreadCount: Math.max(0, current.unreadCount - 1),
    }));
  }

  markAllAsRead(): void {
    this.updateData((current: NotificationsChannelData) => ({
      ...current,
      notifications: current.notifications.map(
        (notification: NotificationData) => ({
          ...notification,
          read: true,
        }),
      ),
      unreadCount: 0,
    }));
  }

  addNotification(notification: NotificationData): void {
    this.updateData((current: NotificationsChannelData) => ({
      notifications: [notification, ...current.notifications],
      unreadCount: notification.read
        ? current.unreadCount
        : current.unreadCount + 1,
    }));
  }

  removeNotification(notificationId: string): void {
    this.updateData((current: NotificationsChannelData) => {
      const notification = current.notifications.find(
        (n: NotificationData) => n.id === notificationId,
      );
      const wasUnread = notification && !notification.read;

      return {
        notifications: current.notifications.filter(
          (n: NotificationData) => n.id !== notificationId,
        ),
        unreadCount: wasUnread
          ? Math.max(0, current.unreadCount - 1)
          : current.unreadCount,
      };
    });
  }

  private updateData(
    updater: (current: NotificationsChannelData) => NotificationsChannelData,
  ): void {
    this.data = updater(this.data);
    if (this.onReceive) {
      this.onReceive(this.data);
    }
  }

  private buildWebSocketUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000";
    return `${baseUrl}/cable`;
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.on("message", (event) => {
      if (event.data) {
        this.handleMessage(event.data);
      }
    });

    this.connection.on("connected", () => {
      console.log("Notifications channel connection established");
    });

    this.connection.on("disconnected", () => {
      console.log("Notifications channel connection lost");
    });

    this.connection.on("error", (event) => {
      console.error("Notifications channel error:", event.error);
    });
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === "confirm_subscription") {
        console.log("Notifications channel subscription confirmed");
        return;
      }

      if (data.type === "reject_subscription") {
        console.error("Notifications channel subscription rejected");
        return;
      }

      // Handle notification events
      if (data.message) {
        const message = data.message as Record<string, unknown>;

        if (message.type === "notification_received" && message.notification) {
          this.addNotification(message.notification as NotificationData);
        } else if (
          message.type === "notification_read" &&
          message.notificationId
        ) {
          this.markAsRead(message.notificationId as string);
        }
      }
    } catch (error) {
      console.error("Error handling notification message:", error);
    }
  }

  private isConnectionPoolReady(): boolean {
    return !!(
      globalConnectionPool &&
      typeof globalConnectionPool.getConnection === "function"
    );
  }
}

// Export a factory function to create notifications channel instances
export const createNotificationsChannel = (
  onReceive: NotificationEventHandler,
) => {
  return new NotificationsChannel(onReceive);
};

// Default instance with console logging
export const notificationsChannel = new NotificationsChannel((data) => {
  console.log("Notifications updated:", data);
});
