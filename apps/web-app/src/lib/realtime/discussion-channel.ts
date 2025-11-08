/**
 * DiscussionChannel class replicating ActionCable behavior
 * Handles real-time messaging for mentor discussions and community interactions
 */

import { RealtimeConnection, ConnectionEvent } from "./connection";
import { globalConnectionPool } from "./connection-pool";

export interface DiscussionMessage {
  id: string;
  uuid: string;
  content: string;
  contentMarkdown: string;
  contentHtml: string;
  author: {
    handle: string;
    avatarUrl: string;
    flair?: string;
    reputation?: string;
  };
  createdAt: string;
  updatedAt: string;
  isAuthor: boolean;
  links: {
    edit?: string;
    delete?: string;
  };
}

export interface DiscussionPost {
  id: string;
  uuid: string;
  iterationIdx: number;
  content: string;
  contentMarkdown: string;
  contentHtml: string;
  author: {
    handle: string;
    avatarUrl: string;
    flair?: string;
    reputation?: string;
  };
  createdAt: string;
  updatedAt: string;
  isAuthor: boolean;
  links: {
    edit?: string;
    delete?: string;
  };
}

export interface DiscussionChannelData {
  discussion: {
    id: string;
    uuid: string;
    status:
      | "awaiting_student"
      | "awaiting_mentor"
      | "mentor_finished"
      | "finished";
    isFinished: boolean;
    links: {
      posts: string;
      markAsNothingToDo: string;
      finish: string;
    };
  };
  posts: DiscussionPost[];
  isStudent: boolean;
  isMentor: boolean;
  student: {
    handle: string;
    avatarUrl: string;
    flair?: string;
    reputation?: string;
  };
  mentor: {
    handle: string;
    avatarUrl: string;
    flair?: string;
    reputation?: string;
  };
  track: {
    title: string;
    iconUrl: string;
  };
  exercise: {
    title: string;
    iconUrl: string;
  };
}

export type DiscussionEventType =
  | "post_created"
  | "post_updated"
  | "post_deleted"
  | "discussion_finished"
  | "status_changed"
  | "user_joined"
  | "user_left"
  | "typing_started"
  | "typing_stopped";

export interface DiscussionEvent {
  type: DiscussionEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

export type DiscussionEventHandler = (event: DiscussionEvent) => void;

export class DiscussionChannel {
  private connection: RealtimeConnection | null = null;
  private discussionUuid: string;
  private subscriberId: string;
  private eventHandlers: Map<DiscussionEventType, Set<DiscussionEventHandler>>;
  private isSubscribed = false;
  private lastActivity = Date.now();
  private typingTimer: NodeJS.Timeout | null = null;

  constructor(discussionUuid: string) {
    this.discussionUuid = discussionUuid;
    this.subscriberId = `discussion_${discussionUuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.eventHandlers = new Map();

    // Initialize event handler sets
    const eventTypes: DiscussionEventType[] = [
      "post_created",
      "post_updated",
      "post_deleted",
      "discussion_finished",
      "status_changed",
      "user_joined",
      "user_left",
      "typing_started",
      "typing_stopped",
    ];
    eventTypes.forEach((type) => {
      this.eventHandlers.set(type, new Set());
    });
  }

  /**
   * Subscribe to the discussion channel
   */
  async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      return;
    }

    const wsUrl = this.buildWebSocketUrl();

    try {
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
        identifier: JSON.stringify({
          channel: "DiscussionChannel",
          discussion_uuid: this.discussionUuid,
        }),
      });

      this.isSubscribed = true;
      console.log(`Subscribed to discussion channel: ${this.discussionUuid}`);
    } catch (error) {
      console.error("Failed to subscribe to discussion channel:", error);
      throw error;
    }
  }

  /**
   * Unsubscribe from the discussion channel
   */
  unsubscribe(): void {
    if (!this.isSubscribed || !this.connection) {
      return;
    }

    // Send unsubscription message
    this.connection.send({
      command: "unsubscribe",
      identifier: JSON.stringify({
        channel: "DiscussionChannel",
        discussion_uuid: this.discussionUuid,
      }),
    });

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId,
    );

    this.connection = null;
    this.isSubscribed = false;

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    console.log(`Unsubscribed from discussion channel: ${this.discussionUuid}`);
  }

  /**
   * Send a new post to the discussion
   */
  sendPost(content: string, iterationIdx?: number): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error("Not subscribed to discussion channel");
    }

    this.connection.send({
      command: "message",
      identifier: JSON.stringify({
        channel: "DiscussionChannel",
        discussion_uuid: this.discussionUuid,
      }),
      data: JSON.stringify({
        action: "create_post",
        content,
        iteration_idx: iterationIdx,
      }),
    });

    this.updateActivity();
  }

  /**
   * Update an existing post
   */
  updatePost(postUuid: string, content: string): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error("Not subscribed to discussion channel");
    }

    this.connection.send({
      command: "message",
      identifier: JSON.stringify({
        channel: "DiscussionChannel",
        discussion_uuid: this.discussionUuid,
      }),
      data: JSON.stringify({
        action: "update_post",
        post_uuid: postUuid,
        content,
      }),
    });

    this.updateActivity();
  }

  /**
   * Delete a post
   */
  deletePost(postUuid: string): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error("Not subscribed to discussion channel");
    }

    this.connection.send({
      command: "message",
      identifier: JSON.stringify({
        channel: "DiscussionChannel",
        discussion_uuid: this.discussionUuid,
      }),
      data: JSON.stringify({
        action: "delete_post",
        post_uuid: postUuid,
      }),
    });

    this.updateActivity();
  }

  /**
   * Finish the discussion
   */
  finishDiscussion(): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error("Not subscribed to discussion channel");
    }

    this.connection.send({
      command: "message",
      identifier: JSON.stringify({
        channel: "DiscussionChannel",
        discussion_uuid: this.discussionUuid,
      }),
      data: JSON.stringify({
        action: "finish_discussion",
      }),
    });

    this.updateActivity();
  }

  /**
   * Send typing indicator
   */
  startTyping(): void {
    if (!this.isSubscribed || !this.connection) {
      return;
    }

    this.connection.send({
      command: "message",
      identifier: JSON.stringify({
        channel: "DiscussionChannel",
        discussion_uuid: this.discussionUuid,
      }),
      data: JSON.stringify({
        action: "typing_started",
      }),
    });

    // Auto-stop typing after 3 seconds of inactivity
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, 3000);
  }

  /**
   * Stop typing indicator
   */
  stopTyping(): void {
    if (!this.isSubscribed || !this.connection) {
      return;
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    this.connection.send({
      command: "message",
      identifier: JSON.stringify({
        channel: "DiscussionChannel",
        discussion_uuid: this.discussionUuid,
      }),
      data: JSON.stringify({
        action: "typing_stopped",
      }),
    });
  }

  /**
   * Add event listener
   */
  on(event: DiscussionEventType, handler: DiscussionEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }

  /**
   * Remove event listener
   */
  off(event: DiscussionEventType, handler: DiscussionEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get subscription status
   */
  isActive(): boolean {
    return this.isSubscribed && this.connection?.isReady() === true;
  }

  /**
   * Get last activity timestamp
   */
  getLastActivity(): number {
    return this.lastActivity;
  }

  private buildWebSocketUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000";
    return `${baseUrl}/cable`;
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.on("message", (event: ConnectionEvent) => {
      if (event.data) {
        this.handleMessage(event.data);
      }
    });

    this.connection.on("connected", () => {
      console.log(
        `Discussion channel connection established: ${this.discussionUuid}`,
      );
    });

    this.connection.on("disconnected", () => {
      console.log(`Discussion channel connection lost: ${this.discussionUuid}`);
    });

    this.connection.on("error", (event: ConnectionEvent) => {
      console.error(
        `Discussion channel error: ${this.discussionUuid}`,
        event.error,
      );
    });
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === "confirm_subscription") {
        console.log(
          `Discussion channel subscription confirmed: ${this.discussionUuid}`,
        );
        return;
      }

      if (data.type === "reject_subscription") {
        console.error(
          `Discussion channel subscription rejected: ${this.discussionUuid}`,
        );
        return;
      }

      // Handle discussion events
      if (data.message) {
        const message = data.message as Record<string, unknown>;
        const event: DiscussionEvent = {
          type: message.type as DiscussionEventType,
          data: message.data as Record<string, unknown>,
          timestamp: (message.timestamp as string) || new Date().toISOString(),
        };

        this.emit(event.type, event);
        this.updateActivity();
      }
    } catch (error) {
      console.error("Error handling discussion message:", error);
    }
  }

  private emit(type: DiscussionEventType, event: DiscussionEvent): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in ${type} event handler:`, error);
        }
      });
    }
  }

  private updateActivity(): void {
    this.lastActivity = Date.now();
  }
}
