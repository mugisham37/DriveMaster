/**
 * SolutionChannel for real-time solution updates
 * Handles solution and iterations updates with WebSocket functionality
 */

import { RealtimeConnection } from "../connection";
import { globalConnectionPool } from "../connection-pool";
import { camelizeKeys } from "humps";
import { Iteration } from "./iteration-channel";

export interface Solution {
  uuid: string;
  status: "started" | "published" | "completed" | "iterated";
  unlockedHelp?: boolean;
  iterated?: boolean;
  iterations?: Array<{
    idx: number;
    uuid: string;
  }>;
  mentorDiscussions?: Array<{
    uuid: string;
  }>;
  mentorRequests?: {
    pending?: Array<{
      uuid: string;
    }>;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SolutionChannelResponse {
  solution: Solution;
  iterations: readonly Iteration[];
}

export type SolutionEventType =
  | "solution_created"
  | "solution_updated"
  | "solution_published"
  | "iteration_added";

export interface SolutionEvent {
  type: SolutionEventType;
  data: SolutionChannelResponse;
  timestamp: string;
}

export type SolutionEventHandler = (response: SolutionChannelResponse) => void;

export class SolutionChannel {
  private connection: RealtimeConnection | null = null;
  private solution: Solution;
  private subscriberId: string;
  private onReceive: SolutionEventHandler;
  private isSubscribed = false;

  constructor(solution: Solution, onReceive: SolutionEventHandler) {
    this.solution = solution;
    this.onReceive = onReceive;
    this.subscriberId = `solution_${solution.uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.subscribe();
  }

  /**
   * Subscribe to the solution channel
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
          channel: "SolutionChannel",
          uuid: this.solution.uuid,
        }),
      });

      this.isSubscribed = true;
      console.log(`Subscribed to solution channel: ${this.solution.uuid}`);
    } catch (error) {
      console.error("Failed to subscribe to solution channel:", error);
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
        channel: "SolutionChannel",
        uuid: this.solution.uuid,
      }),
    });

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId,
    );

    this.connection = null;
    this.isSubscribed = false;

    console.log(`Disconnected from solution channel: ${this.solution.uuid}`);
  }

  /**
   * Check if channel is active
   */
  isActive(): boolean {
    return this.isSubscribed && this.connection?.isReady() === true;
  }

  /**
   * Publish the solution
   */
  publishSolution(): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error("Not subscribed to solution channel");
    }

    this.connection.send({
      command: "message",
      identifier: JSON.stringify({
        channel: "SolutionChannel",
        uuid: this.solution.uuid,
      }),
      data: JSON.stringify({
        action: "publish_solution",
      }),
    });
  }

  /**
   * Unpublish the solution
   */
  unpublishSolution(): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error("Not subscribed to solution channel");
    }

    this.connection.send({
      command: "message",
      identifier: JSON.stringify({
        channel: "SolutionChannel",
        uuid: this.solution.uuid,
      }),
      data: JSON.stringify({
        action: "unpublish_solution",
      }),
    });
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
        `Solution channel connection established: ${this.solution.uuid}`,
      );
    });

    this.connection.on("disconnected", () => {
      console.log(`Solution channel connection lost: ${this.solution.uuid}`);
    });

    this.connection.on("error", (event) => {
      console.error(
        `Solution channel error: ${this.solution.uuid}`,
        event.error,
      );
    });
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === "confirm_subscription") {
        console.log(
          `Solution channel subscription confirmed: ${this.solution.uuid}`,
        );
        return;
      }

      if (data.type === "reject_subscription") {
        console.error(
          `Solution channel subscription rejected: ${this.solution.uuid}`,
        );
        return;
      }

      // Handle solution events with camelCase conversion
      if (data.message) {
        const response = camelizeKeys(data.message) as SolutionChannelResponse;

        // Validate the response
        if (this.isValidSolutionResponse(response)) {
          this.onReceive(response);
        } else {
          console.error("Invalid solution response received:", response);
        }
      }
    } catch (error) {
      console.error("Error handling solution message:", error);
    }
  }

  private isValidSolutionResponse(
    data: unknown,
  ): data is SolutionChannelResponse {
    const obj = data as Record<string, unknown>;
    return (
      data !== null &&
      data !== undefined &&
      typeof data === "object" &&
      "solution" in obj &&
      typeof obj.solution === "object" &&
      obj.solution !== null &&
      "uuid" in (obj.solution as Record<string, unknown>) &&
      "iterations" in obj &&
      Array.isArray(obj.iterations)
    );
  }
}
