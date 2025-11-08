/**
 * Real-time system configuration
 * Manages environment-specific settings for WebSocket and SSE connections
 */

export interface RealtimeConfig {
  wsUrl: string;
  apiUrl: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  notificationStreamPath: string;
  discussionChannelPath: string;
}

/**
 * Get real-time configuration based on environment
 */
export function getRealtimeConfig(): RealtimeConfig {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Base URLs
  const wsUrl =
    process.env.NEXT_PUBLIC_WS_URL ||
    (isDevelopment ? "ws://localhost:3000" : "wss://exercism.org");

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (isDevelopment ? "http://localhost:3000" : "https://exercism.org");

  return {
    wsUrl,
    apiUrl,
    reconnectInterval: parseInt(
      process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL || "1000",
    ),
    maxReconnectAttempts: parseInt(
      process.env.NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS || "5",
    ),
    heartbeatInterval: parseInt(
      process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL || "30000",
    ),
    notificationStreamPath: "/api/notifications/stream",
    discussionChannelPath: "/cable",
  };
}

/**
 * Validate real-time configuration
 */
export function validateRealtimeConfig(config: RealtimeConfig): boolean {
  const requiredFields = ["wsUrl", "apiUrl"];

  for (const field of requiredFields) {
    if (!config[field as keyof RealtimeConfig]) {
      console.error(`Missing required real-time config field: ${field}`);
      return false;
    }
  }

  // Validate URLs
  try {
    new URL(
      config.wsUrl.replace("ws://", "http://").replace("wss://", "https://"),
    );
    new URL(config.apiUrl);
  } catch (error) {
    console.error("Invalid URLs in real-time config:", error);
    return false;
  }

  // Validate numeric values
  if (config.reconnectInterval < 100 || config.reconnectInterval > 60000) {
    console.error("Invalid reconnectInterval: must be between 100ms and 60s");
    return false;
  }

  if (config.maxReconnectAttempts < 1 || config.maxReconnectAttempts > 20) {
    console.error("Invalid maxReconnectAttempts: must be between 1 and 20");
    return false;
  }

  if (config.heartbeatInterval < 5000 || config.heartbeatInterval > 300000) {
    console.error("Invalid heartbeatInterval: must be between 5s and 5m");
    return false;
  }

  return true;
}

/**
 * Get validated real-time configuration
 */
export function getValidatedRealtimeConfig(): RealtimeConfig {
  const config = getRealtimeConfig();

  if (!validateRealtimeConfig(config)) {
    throw new Error("Invalid real-time configuration");
  }

  return config;
}

/**
 * Real-time feature flags
 */
export interface RealtimeFeatureFlags {
  enableDiscussions: boolean;
  enableNotifications: boolean;
  enableTypingIndicators: boolean;
  enableConnectionPooling: boolean;
  enableHeartbeat: boolean;
  enableAutoReconnect: boolean;
}

/**
 * Get real-time feature flags
 */
export function getRealtimeFeatureFlags(): RealtimeFeatureFlags {
  return {
    enableDiscussions: process.env.NEXT_PUBLIC_ENABLE_DISCUSSIONS !== "false",
    enableNotifications:
      process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== "false",
    enableTypingIndicators:
      process.env.NEXT_PUBLIC_ENABLE_TYPING_INDICATORS !== "false",
    enableConnectionPooling:
      process.env.NEXT_PUBLIC_ENABLE_CONNECTION_POOLING !== "false",
    enableHeartbeat: process.env.NEXT_PUBLIC_ENABLE_HEARTBEAT !== "false",
    enableAutoReconnect:
      process.env.NEXT_PUBLIC_ENABLE_AUTO_RECONNECT !== "false",
  };
}
