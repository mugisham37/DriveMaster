/**
 * WebSocket Module - Main Export File
 *
 * Exports WebSocket client, manager, and related utilities for real-time
 * content updates and collaboration features.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

// WebSocket Client
export {
  ContentWebSocketClient,
  createContentWebSocketClient,
  getContentWebSocketClient,
  destroyContentWebSocketClient,
} from "./content-websocket-client";

// WebSocket Manager
export {
  WebSocketManager,
  createWebSocketManager,
  getWebSocketManager,
  destroyWebSocketManager,
} from "./websocket-manager";

// Re-export WebSocket types
export type * from "../../../types/websocket";
