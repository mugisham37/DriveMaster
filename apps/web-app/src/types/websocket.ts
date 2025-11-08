/**
 * WebSocket Types for Content Service
 *
 * Type definitions for real-time updates, collaboration features,
 * and WebSocket communication with the content service.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

// ============================================================================
// WebSocket Configuration
// ============================================================================

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
  enableLogging: boolean;
  enablePresence: boolean;
  enableCollaboration: boolean;
  autoConnect?: boolean;
}

// ============================================================================
// Connection State
// ============================================================================

export type WebSocketConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

// ============================================================================
// WebSocket Messages
// ============================================================================

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload?: unknown;
  timestamp: Date;
  id?: string;
}

export type WebSocketMessageType =
  | "subscribe"
  | "unsubscribe"
  | "content_changed"
  | "presence_updated"
  | "presence_update"
  | "collaboration_event"
  | "subscription_confirmed"
  | "subscription_error"
  | "ping"
  | "pong"
  | "error";

// ============================================================================
// Subscription Management
// ============================================================================

export interface WebSocketSubscription {
  id: string;
  type: WebSocketSubscriptionType;
  itemId?: string;
  userId?: string;
  createdAt: Date;
  filters?: Record<string, unknown>;
}

export type WebSocketSubscriptionType =
  | "content_changes"
  | "presence"
  | "collaboration"
  | "workflow_updates"
  | "bulk_operations";

// ============================================================================
// Content Change Notifications
// ============================================================================

export interface ContentChangeNotification {
  itemId: string;
  changeType: ContentChangeType;
  userId: string;
  timestamp: Date;
  changes: ContentChange[];
  version?: string;
  metadata?: Record<string, unknown>;
}

export type ContentChangeType =
  | "created"
  | "updated"
  | "deleted"
  | "published"
  | "archived"
  | "restored"
  | "status_changed"
  | "media_added"
  | "media_removed";

export interface ContentChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  operation: "insert" | "update" | "delete";
  position?: number;
  length?: number;
}

// ============================================================================
// Presence Management
// ============================================================================

export interface PresenceUpdate {
  itemId: string;
  userId: string;
  status: PresenceStatus;
  timestamp: Date;
  metadata?: PresenceMetadata;
}

export type PresenceStatus = "active" | "idle" | "away" | "offline";

export interface PresenceMetadata {
  userAgent?: string;
  lastActivity?: Date;
  currentSection?: string;
  cursorPosition?: CursorPosition;
  selection?: TextSelection;
}

export interface CursorPosition {
  line: number;
  column: number;
  element?: string;
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
  element?: string;
}

// ============================================================================
// Collaboration Events
// ============================================================================

export interface CollaborationEvent {
  type: CollaborationEventType;
  itemId: string;
  userId: string;
  timestamp: Date;
  data: CollaborationEventData;
}

export type CollaborationEventType =
  | "cursor_move"
  | "text_selection"
  | "text_edit"
  | "comment_added"
  | "comment_resolved"
  | "user_joined"
  | "user_left"
  | "lock_acquired"
  | "lock_released";

export interface CollaborationEventData {
  position?: CursorPosition;
  selection?: TextSelection;
  edit?: TextEdit;
  comment?: Comment;
  lock?: ContentLock;
  [key: string]: unknown;
}

export interface TextEdit {
  operation: "insert" | "delete" | "replace";
  position: number;
  length?: number;
  text?: string;
  timestamp: Date;
}

export interface Comment {
  id: string;
  text: string;
  position: number;
  resolved: boolean;
  timestamp: Date;
}

export interface ContentLock {
  section: string;
  userId: string;
  timestamp: Date;
  expiresAt: Date;
}

// ============================================================================
// Conflict Resolution
// ============================================================================

export interface ConflictResolution {
  conflictId: string;
  itemId: string;
  conflictType: ConflictType;
  localChanges: ContentChange[];
  remoteChanges: ContentChange[];
  resolution: ConflictResolutionStrategy;
  resolvedChanges: ContentChange[];
  timestamp: Date;
}

export type ConflictType =
  | "concurrent_edit"
  | "version_mismatch"
  | "lock_conflict"
  | "permission_conflict";

export type ConflictResolutionStrategy =
  | "local_wins"
  | "remote_wins"
  | "merge"
  | "manual";

// ============================================================================
// WebSocket Errors
// ============================================================================

export interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  timestamp: Date;
  code?: string | number;
  event?: Event;
  retryable?: boolean;
}

export type WebSocketErrorType =
  | "connection"
  | "authentication"
  | "authorization"
  | "parse"
  | "send"
  | "server"
  | "timeout"
  | "protocol";

// ============================================================================
// Real-time Cache Integration
// ============================================================================

export interface CacheInvalidationEvent {
  type: "invalidate" | "update" | "refresh";
  keys: string[];
  itemId?: string;
  timestamp: Date;
  source: "websocket" | "api" | "manual";
}

export interface RealTimeCacheConfig {
  enableAutoInvalidation: boolean;
  enableOptimisticUpdates: boolean;
  conflictResolutionStrategy: ConflictResolutionStrategy;
  maxConflictRetries: number;
  invalidationDelay: number;
}

// ============================================================================
// WebSocket Metrics
// ============================================================================

export interface WebSocketMetrics {
  connectionUptime: number;
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  reconnectionCount: number;
  errorCount: number;
  subscriptionCount: number;
  lastHeartbeat?: Date;
}

// ============================================================================
// Presence Tracking
// ============================================================================

export interface PresenceTracker {
  itemId: string;
  activeUsers: Map<string, PresenceUpdate>;
  lastUpdate: Date;
  maxUsers: number;
}

export interface UserPresence {
  userId: string;
  displayName: string;
  avatar?: string;
  status: PresenceStatus;
  lastSeen: Date;
  currentPosition?: CursorPosition;
  currentSelection?: TextSelection;
}

// ============================================================================
// Collaboration Session
// ============================================================================

export interface CollaborationSession {
  id: string;
  itemId: string;
  participants: Map<string, UserPresence>;
  startedAt: Date;
  lastActivity: Date;
  locks: Map<string, ContentLock>;
  events: CollaborationEvent[];
}

// ============================================================================
// WebSocket Event Handlers
// ============================================================================

export interface WebSocketEventMap {
  connected: () => void;
  disconnected: (reason: string) => void;
  reconnecting: (attempt: number) => void;
  error: (error: WebSocketError) => void;
  content_changed: (notification: ContentChangeNotification) => void;
  presence_updated: (update: PresenceUpdate) => void;
  collaboration_event: (event: CollaborationEvent) => void;
  subscription_confirmed: (subscription: WebSocketSubscription) => void;
  subscription_error: (error: {
    subscription: WebSocketSubscription;
    error: string;
  }) => void;
  cache_invalidation: (event: CacheInvalidationEvent) => void;
  conflict_detected: (conflict: ConflictResolution) => void;
}

// ============================================================================
// WebSocket Client Interface
// ============================================================================

export interface IWebSocketClient {
  // Connection management
  connect(): Promise<void>;
  disconnect(): void;
  destroy(): void;
  isConnected(): boolean;
  getConnectionState(): WebSocketConnectionState;

  // Subscription management
  subscribeToContentChanges(itemId: string): string;
  subscribeToPresence(itemId: string): string;
  subscribeToCollaboration(itemId: string): string;
  unsubscribe(subscriptionId: string): void;
  unsubscribeAll(): void;

  // Collaboration features
  sendCursorPosition(itemId: string, position: CursorPosition): void;
  sendTextSelection(itemId: string, selection: TextSelection): void;
  updatePresence(itemId: string, status: PresenceStatus): void;

  // Event handling
  on<K extends keyof WebSocketEventMap>(
    event: K,
    handler: WebSocketEventMap[K],
  ): void;
  off<K extends keyof WebSocketEventMap>(event: K): void;

  // Statistics and monitoring
  getConnectionStats(): WebSocketMetrics;
  getActiveSubscriptions(): WebSocketSubscription[];
}

// ============================================================================
// WebSocket Manager Configuration
// ============================================================================

export interface WebSocketManagerConfig extends WebSocketConfig {
  enableCacheIntegration: boolean;
  enableConflictResolution: boolean;
  enablePresenceTracking: boolean;
  enableCollaborationFeatures: boolean;
  cacheConfig?: RealTimeCacheConfig;
}

// ============================================================================
// Export Types for DTOs
// ============================================================================

export interface WebSocketSubscriptionDto {
  type: WebSocketSubscriptionType;
  itemId?: string;
  userId?: string;
  filters?: Record<string, unknown>;
}

export interface WebSocketMessageDto {
  type: WebSocketMessageType;
  payload?: unknown;
  timestamp?: string;
  id?: string;
}
