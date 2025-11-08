/**
 * AIHelpRecordsChannel for real-time AI help feedback
 * Handles ChatGPT feedback integration for submissions
 */

import { RealtimeConnection } from "../connection";
import { globalConnectionPool } from "../connection-pool";

export interface AIHelpRecordsChannelResponse {
  id: string;
  uuid: string;
  submissionUuid: string;
  content: string;
  contentHtml: string;
  source: "chatgpt" | "ai_assistant";
  status: "pending" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export type AIHelpRecordsEventType =
  | "help_record_created"
  | "help_record_updated"
  | "help_record_completed"
  | "help_record_failed";

export interface AIHelpRecordsEvent {
  type: AIHelpRecordsEventType;
  data: AIHelpRecordsChannelResponse;
  timestamp: string;
}

export type AIHelpRecordsEventHandler = (
  response: AIHelpRecordsChannelResponse,
) => void;

export class AIHelpRecordsChannel {
  private connection: RealtimeConnection | null = null;
  private submissionUuid: string;
  private subscriberId: string;
  private onReceive: AIHelpRecordsEventHandler;
  private isSubscribed = false;

  constructor(submissionUuid: string, onReceive: AIHelpRecordsEventHandler) {
    this.submissionUuid = submissionUuid;
    this.onReceive = onReceive;
    this.subscriberId = `ai_help_records_${submissionUuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.subscribe();
  }

  /**
   * Subscribe to the AI help records channel
   */
  private async subscribe(): Promise<void> {
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
          channel: "Submission::AIHelpRecordsChannel",
          submission_uuid: this.submissionUuid,
        }),
      });

      this.isSubscribed = true;
      console.log(
        `Subscribed to AI help records channel: ${this.submissionUuid}`,
      );
    } catch (error) {
      console.error("Failed to subscribe to AI help records channel:", error);
      throw error;
    }
  }

  /**
   * Disconnect from the channel
   */
  disconnect(): void {
    if (!this.isSubscribed || !this.connection) {
      return;
    }

    // Send unsubscription message
    this.connection.send({
      command: "unsubscribe",
      identifier: JSON.stringify({
        channel: "Submission::AIHelpRecordsChannel",
        submission_uuid: this.submissionUuid,
      }),
    });

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId,
    );

    this.connection = null;
    this.isSubscribed = false;

    console.log(
      `Disconnected from AI help records channel: ${this.submissionUuid}`,
    );
  }

  /**
   * Check if channel is active
   */
  isActive(): boolean {
    return this.isSubscribed && this.connection?.isReady() === true;
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
      console.log(
        `AI help records channel connection established: ${this.submissionUuid}`,
      );
    });

    this.connection.on("disconnected", () => {
      console.log(
        `AI help records channel connection lost: ${this.submissionUuid}`,
      );
    });

    this.connection.on("error", (event) => {
      console.error(
        `AI help records channel error: ${this.submissionUuid}`,
        event.error,
      );
    });
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === "confirm_subscription") {
        console.log(
          `AI help records channel subscription confirmed: ${this.submissionUuid}`,
        );
        return;
      }

      if (data.type === "reject_subscription") {
        console.error(
          `AI help records channel subscription rejected: ${this.submissionUuid}`,
        );
        return;
      }

      // Handle AI help records events
      if (data.message) {
        const response = data.message as AIHelpRecordsChannelResponse;
        this.onReceive(response);
      }
    } catch (error) {
      console.error("Error handling AI help records message:", error);
    }
  }
}
