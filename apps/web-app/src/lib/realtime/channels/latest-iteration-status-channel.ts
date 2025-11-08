/**
 * LatestIterationStatusChannel for real-time iteration status tracking
 * Handles latest iteration status updates for exercise submissions
 */

import { RealtimeConnection } from "../connection";
import { globalConnectionPool } from "../connection-pool";

export type IterationStatus =
  | "queued"
  | "testing"
  | "passed"
  | "failed"
  | "errored"
  | "cancelled";

export interface LatestIterationStatusResponse {
  status: IterationStatus;
  uuid?: string;
  submissionUuid?: string;
  testsStatus?: string;
  representationStatus?: string;
  analysisStatus?: string;
  updatedAt?: string;
}

export type LatestIterationStatusEventType =
  | "status_changed"
  | "tests_completed"
  | "analysis_completed"
  | "representation_completed";

export interface LatestIterationStatusEvent {
  type: LatestIterationStatusEventType;
  data: LatestIterationStatusResponse;
  timestamp: string;
}

export type LatestIterationStatusEventHandler = (
  response: LatestIterationStatusResponse,
) => void;

export class LatestIterationStatusChannel {
  private connection: RealtimeConnection | null = null;
  private uuid: string;
  private subscriberId: string;
  private onReceive: LatestIterationStatusEventHandler;
  private isSubscribed = false;

  constructor(uuid: string, onReceive: LatestIterationStatusEventHandler) {
    this.uuid = uuid;
    this.onReceive = onReceive;
    this.subscriberId = `latest_iteration_status_${uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.subscribe();
  }

  /**
   * Subscribe to the latest iteration status channel
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
          channel: "LatestIterationStatusChannel",
          uuid: this.uuid,
        }),
      });

      this.isSubscribed = true;
      console.log(
        `Subscribed to latest iteration status channel: ${this.uuid}`,
      );
    } catch (error) {
      console.error(
        "Failed to subscribe to latest iteration status channel:",
        error,
      );
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
        channel: "LatestIterationStatusChannel",
        uuid: this.uuid,
      }),
    });

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId,
    );

    this.connection = null;
    this.isSubscribed = false;

    console.log(
      `Disconnected from latest iteration status channel: ${this.uuid}`,
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
        `Latest iteration status channel connection established: ${this.uuid}`,
      );
    });

    this.connection.on("disconnected", () => {
      console.log(
        `Latest iteration status channel connection lost: ${this.uuid}`,
      );
    });

    this.connection.on("error", (event) => {
      console.error(
        `Latest iteration status channel error: ${this.uuid}`,
        event.error,
      );
    });
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === "confirm_subscription") {
        console.log(
          `Latest iteration status channel subscription confirmed: ${this.uuid}`,
        );
        return;
      }

      if (data.type === "reject_subscription") {
        console.error(
          `Latest iteration status channel subscription rejected: ${this.uuid}`,
        );
        return;
      }

      // Handle status events
      if (data.message) {
        const response = data.message as LatestIterationStatusResponse;

        // Validate the response
        if (this.isValidStatusResponse(response)) {
          this.onReceive(response);
        } else {
          console.error("Invalid status response received:", response);
        }
      }
    } catch (error) {
      console.error("Error handling latest iteration status message:", error);
    }
  }

  private isValidStatusResponse(
    data: unknown,
  ): data is LatestIterationStatusResponse {
    return (
      data !== null &&
      data !== undefined &&
      typeof data === "object" &&
      "status" in data &&
      typeof (data as Record<string, unknown>).status === "string" &&
      [
        "queued",
        "testing",
        "passed",
        "failed",
        "errored",
        "cancelled",
      ].includes((data as Record<string, unknown>).status as string)
    );
  }
}
