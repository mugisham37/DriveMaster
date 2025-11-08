"use client";

/**
 * Cross-Tab Synchronization System
 *
 * Implements:
 * - Tab synchronization for authentication state changes
 * - Conflict resolution for simultaneous login attempts
 * - Logout event propagation to all open tabs
 * - Token refresh synchronization across tabs
 */

import { tokenStorage, TokenPair } from "./token-storage";
import { tokenRefreshManager } from "./token-refresh";

export interface AuthSyncMessage {
  type:
    | "LOGIN"
    | "LOGOUT"
    | "TOKEN_REFRESH"
    | "SESSION_EXPIRED"
    | "CONFLICT_RESOLUTION";
  payload?: unknown;
  timestamp: number;
  tabId: string;
}

export interface LoginSyncPayload {
  tokens: TokenPair;
  user: Record<string, unknown>;
}

export interface ConflictResolutionPayload {
  action: "FORCE_LOGOUT" | "KEEP_SESSION";
  reason: string;
}

/**
 * Cross-tab authentication synchronization manager
 */
export class CrossTabSyncManager {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private isInitialized = false;
  private messageListeners: Array<(message: AuthSyncMessage) => void> = [];
  private readonly channelName = "exercism-auth-sync";

  constructor() {
    this.tabId = this.generateTabId();
    this.initialize();
  }

  /**
   * Initialize the broadcast channel and set up listeners
   */
  private initialize(): void {
    if (typeof window === "undefined" || this.isInitialized) return;

    try {
      // Create broadcast channel
      this.channel = new BroadcastChannel(this.channelName);

      // Set up message listener
      this.channel.addEventListener("message", this.handleMessage.bind(this));

      // Set up beforeunload listener to notify other tabs
      window.addEventListener("beforeunload", this.handleTabClose.bind(this));

      // Set up visibility change listener
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange.bind(this),
      );

      this.isInitialized = true;
      console.log(`Cross-tab sync initialized for tab: ${this.tabId}`);
    } catch (error) {
      console.error("Failed to initialize cross-tab sync:", error);
      // Fallback: use localStorage events for older browsers
      this.initializeFallback();
    }
  }

  /**
   * Fallback initialization using localStorage events
   */
  private initializeFallback(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("storage", (event) => {
      if (event.key === this.channelName && event.newValue) {
        try {
          const message: AuthSyncMessage = JSON.parse(event.newValue);
          this.handleMessage({ data: message } as MessageEvent);
        } catch (error) {
          console.error("Failed to parse storage sync message:", error);
        }
      }
    });

    this.isInitialized = true;
    console.log("Cross-tab sync initialized with localStorage fallback");
  }

  /**
   * Handle incoming sync messages
   */
  private handleMessage(event: MessageEvent<AuthSyncMessage>): void {
    const message = event.data;

    // Ignore messages from the same tab
    if (message.tabId === this.tabId) return;

    console.log(
      "Received sync message:",
      message.type,
      "from tab:",
      message.tabId,
    );

    switch (message.type) {
      case "LOGIN":
        this.handleLoginSync(message.payload as LoginSyncPayload);
        break;

      case "LOGOUT":
        this.handleLogoutSync();
        break;

      case "TOKEN_REFRESH":
        this.handleTokenRefreshSync(message.payload as TokenPair);
        break;

      case "SESSION_EXPIRED":
        this.handleSessionExpiredSync();
        break;

      case "CONFLICT_RESOLUTION":
        this.handleConflictResolution(
          message.payload as ConflictResolutionPayload,
        );
        break;
    }

    // Notify listeners
    this.notifyListeners(message);
  }

  /**
   * Handle login synchronization from another tab
   */
  private async handleLoginSync(payload: LoginSyncPayload): Promise<void> {
    try {
      // Check for conflicts - if we already have tokens, resolve conflict
      const existingToken = tokenStorage.getAccessToken();

      if (existingToken && tokenStorage.isAccessTokenValid()) {
        // Conflict detected - another tab logged in while we have a valid session
        await this.resolveLoginConflict(payload);
        return;
      }

      // No conflict - sync the login state
      await tokenStorage.storeTokens(payload.tokens);
      console.log("Login state synchronized from another tab");
    } catch (error) {
      console.error("Failed to sync login state:", error);
    }
  }

  /**
   * Handle logout synchronization from another tab
   */
  private async handleLogoutSync(): Promise<void> {
    try {
      await tokenStorage.clearTokens();

      // Clear any ongoing refresh operations
      tokenRefreshManager.clearQueue();

      console.log("Logout synchronized from another tab");

      // Redirect to login page if not already there
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/auth/signin")
      ) {
        window.location.href = "/auth/signin";
      }
    } catch (error) {
      console.error("Failed to sync logout:", error);
    }
  }

  /**
   * Handle token refresh synchronization from another tab
   */
  private async handleTokenRefreshSync(tokens: TokenPair): Promise<void> {
    try {
      // Only sync if we don't have a valid token or if the new token is newer
      const currentToken = tokenStorage.getAccessToken();

      if (!currentToken || !tokenStorage.isAccessTokenValid()) {
        await tokenStorage.storeTokens(tokens);
        console.log("Token refresh synchronized from another tab");
      }
    } catch (error) {
      console.error("Failed to sync token refresh:", error);
    }
  }

  /**
   * Handle session expiration synchronization
   */
  private async handleSessionExpiredSync(): Promise<void> {
    try {
      await tokenStorage.clearTokens();
      console.log("Session expiration synchronized from another tab");

      // Redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/auth/signin?reason=session_expired";
      }
    } catch (error) {
      console.error("Failed to sync session expiration:", error);
    }
  }

  /**
   * Resolve login conflicts when multiple tabs have active sessions
   */
  private async resolveLoginConflict(
    newLoginPayload: LoginSyncPayload,
  ): Promise<void> {
    console.log("Login conflict detected, resolving...");

    // Strategy: Keep the most recent login (newer timestamp wins)
    const currentTokenInfo = tokenStorage.getTokenInfo();
    const currentExpiration = currentTokenInfo.accessTokenExpiration;

    if (!currentExpiration) {
      // Current token is invalid, accept new login
      await tokenStorage.storeTokens(newLoginPayload.tokens);
      return;
    }

    // Compare token expiration times (newer token likely means more recent login)
    const newTokenValidation = tokenStorage.validateToken(
      newLoginPayload.tokens.accessToken,
    );

    if (
      newTokenValidation.expiresAt &&
      newTokenValidation.expiresAt > currentExpiration
    ) {
      // New login is more recent, accept it
      await tokenStorage.storeTokens(newLoginPayload.tokens);
      console.log("Conflict resolved: Accepted newer login from another tab");
    } else {
      // Current login is more recent, keep it and notify other tab
      this.broadcastMessage({
        type: "CONFLICT_RESOLUTION",
        payload: {
          action: "KEEP_SESSION",
          reason: "Current session is more recent",
        } as ConflictResolutionPayload,
      });
      console.log("Conflict resolved: Kept current session");
    }
  }

  /**
   * Handle conflict resolution messages
   */
  private handleConflictResolution(payload: ConflictResolutionPayload): void {
    console.log(
      "Received conflict resolution:",
      payload.action,
      payload.reason,
    );

    if (payload.action === "FORCE_LOGOUT") {
      this.handleLogoutSync();
    }
  }

  /**
   * Broadcast login event to other tabs
   */
  async broadcastLogin(
    tokens: TokenPair,
    user: Record<string, unknown>,
  ): Promise<void> {
    const payload: LoginSyncPayload = { tokens, user };

    await this.broadcastMessage({
      type: "LOGIN",
      payload,
    });
  }

  /**
   * Broadcast logout event to other tabs
   */
  async broadcastLogout(): Promise<void> {
    await this.broadcastMessage({
      type: "LOGOUT",
    });
  }

  /**
   * Broadcast token refresh event to other tabs
   */
  async broadcastTokenRefresh(tokens: TokenPair): Promise<void> {
    await this.broadcastMessage({
      type: "TOKEN_REFRESH",
      payload: tokens,
    });
  }

  /**
   * Broadcast session expiration to other tabs
   */
  async broadcastSessionExpired(): Promise<void> {
    await this.broadcastMessage({
      type: "SESSION_EXPIRED",
    });
  }

  /**
   * Send message to other tabs
   */
  private async broadcastMessage(
    message: Omit<AuthSyncMessage, "timestamp" | "tabId">,
  ): Promise<void> {
    if (!this.isInitialized) return;

    const fullMessage: AuthSyncMessage = {
      ...message,
      timestamp: Date.now(),
      tabId: this.tabId,
    };

    try {
      if (this.channel) {
        this.channel.postMessage(fullMessage);
      } else {
        // Fallback to localStorage
        localStorage.setItem(this.channelName, JSON.stringify(fullMessage));
        // Clear immediately to trigger storage event
        setTimeout(() => localStorage.removeItem(this.channelName), 100);
      }
    } catch (error) {
      console.error("Failed to broadcast message:", error);
    }
  }

  /**
   * Handle tab close event
   */
  private handleTabClose(): void {
    // Clean up resources
    this.cleanup();
  }

  /**
   * Handle visibility change (tab focus/blur)
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === "visible") {
      // Tab became visible, check if tokens are still valid
      this.validateTokensOnFocus();
    }
  }

  /**
   * Validate tokens when tab becomes visible
   */
  private async validateTokensOnFocus(): Promise<void> {
    try {
      const hasValidToken = tokenStorage.isAccessTokenValid();

      if (!hasValidToken) {
        const refreshToken = tokenStorage.getRefreshToken();

        if (refreshToken) {
          // Try to refresh tokens
          await tokenRefreshManager.getValidAccessToken();
        } else {
          // No valid tokens, broadcast session expired
          await this.broadcastSessionExpired();
        }
      }
    } catch (error) {
      console.error("Token validation on focus failed:", error);
    }
  }

  /**
   * Add message listener
   */
  addMessageListener(callback: (message: AuthSyncMessage) => void): () => void {
    this.messageListeners.push(callback);

    return () => {
      const index = this.messageListeners.indexOf(callback);
      if (index !== -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all message listeners
   */
  private notifyListeners(message: AuthSyncMessage): void {
    this.messageListeners.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        console.error("Error in sync message listener:", error);
      }
    });
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current tab ID
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * Check if cross-tab sync is supported
   */
  isSupported(): boolean {
    return (
      typeof BroadcastChannel !== "undefined" || typeof Storage !== "undefined"
    );
  }

  /**
   * Get sync status for debugging
   */
  getStatus(): {
    isInitialized: boolean;
    tabId: string;
    isSupported: boolean;
    hasChannel: boolean;
    listenerCount: number;
  } {
    return {
      isInitialized: this.isInitialized,
      tabId: this.tabId,
      isSupported: this.isSupported(),
      hasChannel: !!this.channel,
      listenerCount: this.messageListeners.length,
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.messageListeners = [];
    this.isInitialized = false;
  }
}

// Singleton instance for global use
export const crossTabSync = new CrossTabSyncManager();

/**
 * React hook for cross-tab synchronization
 */
export function useCrossTabSync() {
  const broadcastLogin = async (
    tokens: TokenPair,
    user: Record<string, unknown>,
  ) => {
    return crossTabSync.broadcastLogin(tokens, user);
  };

  const broadcastLogout = async () => {
    return crossTabSync.broadcastLogout();
  };

  const broadcastTokenRefresh = async (tokens: TokenPair) => {
    return crossTabSync.broadcastTokenRefresh(tokens);
  };

  const addMessageListener = (callback: (message: AuthSyncMessage) => void) => {
    return crossTabSync.addMessageListener(callback);
  };

  const getStatus = () => {
    return crossTabSync.getStatus();
  };

  return {
    broadcastLogin,
    broadcastLogout,
    broadcastTokenRefresh,
    addMessageListener,
    getStatus,
    tabId: crossTabSync.getTabId(),
    isSupported: crossTabSync.isSupported(),
  };
}
