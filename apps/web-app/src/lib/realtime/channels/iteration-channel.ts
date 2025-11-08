/**
 * IterationChannel for real-time iteration updates
 * Handles exercise iteration status updates with camelCase conversion
 */

import { RealtimeConnection } from "../connection";
import { globalConnectionPool } from "../connection-pool";
import { camelizeKeys } from "humps";

export interface Iteration {
  idx: number;
  uuid: string;
  submissionUuid: string;
  createdAt: string;
  testsStatus: string;
  representationStatus: string;
  analysisStatus: string;
  isPublished: boolean;
  files: Array<{
    filename: string;
    content: string;
  }>;
  links: {
    self: string;
    tests: string;
    delete?: string;
  };
}

export type IterationEventType =
  | "iteration_created"
  | "iteration_updated"
  | "iteration_published"
  | "iteration_tests_completed";

export interface IterationEvent {
  type: IterationEventType;
  data: Iteration;
  timestamp: string;
}

export type IterationEventHandler = (iteration: Iteration) => void;

export class IterationChannel {
  private connection: RealtimeConnection | null = null;
  private uuid: string;
  private subscriberId: string;
  private onReceive: IterationEventHandler;
  private isSubscribed = false;

  constructor(uuid: string, onReceive: IterationEventHandler) {
    this.uuid = uuid;
    this.onReceive = onReceive;
    this.subscriberId = `iteration_${uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.subscribe();
  }

  /**
   * Subscribe to the iteration channel
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
          channel: "IterationChannel",
          uuid: this.uuid,
        }),
      });

      this.isSubscribed = true;
      console.log(`Subscribed to iteration channel: ${this.uuid}`);
    } catch (error) {
      console.error("Failed to subscribe to iteration channel:", error);
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
        channel: "IterationChannel",
        uuid: this.uuid,
      }),
    });

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId,
    );

    this.connection = null;
    this.isSubscribed = false;

    console.log(`Disconnected from iteration channel: ${this.uuid}`);
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
      console.log(`Iteration channel connection established: ${this.uuid}`);
    });

    this.connection.on("disconnected", () => {
      console.log(`Iteration channel connection lost: ${this.uuid}`);
    });

    this.connection.on("error", (event) => {
      console.error(`Iteration channel error: ${this.uuid}`, event.error);
    });
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === "confirm_subscription") {
        console.log(`Iteration channel subscription confirmed: ${this.uuid}`);
        return;
      }

      if (data.type === "reject_subscription") {
        console.error(`Iteration channel subscription rejected: ${this.uuid}`);
        return;
      }

      // Handle iteration events with camelCase conversion
      if (data.message) {
        const formattedResponse = camelizeKeys(data.message);

        // Type check and validate the iteration data
        if (this.isValidIteration(formattedResponse)) {
          this.onReceive(formattedResponse as Iteration);
        } else {
          console.error("Invalid iteration data received:", formattedResponse);
        }
      }
    } catch (error) {
      console.error("Error handling iteration message:", error);
    }
  }

  private isValidIteration(data: unknown): data is Iteration {
    return (
      data !== null &&
      data !== undefined &&
      typeof data === "object" &&
      "idx" in data &&
      "uuid" in data &&
      "submissionUuid" in data &&
      "createdAt" in data &&
      "files" in data &&
      typeof (data as Record<string, unknown>).idx === "number" &&
      typeof (data as Record<string, unknown>).uuid === "string" &&
      typeof (data as Record<string, unknown>).submissionUuid === "string" &&
      typeof (data as Record<string, unknown>).createdAt === "string" &&
      Array.isArray((data as Record<string, unknown>).files)
    );
  }
}
