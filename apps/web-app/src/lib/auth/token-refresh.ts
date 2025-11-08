"use client";

/**
 * Automatic Token Refresh System
 *
 * Implements:
 * - Atomic token refresh to prevent race conditions
 * - Request queuing during token refresh
 * - Token rotation with proper cleanup
 * - Event-driven refresh notifications
 */

import { tokenStorage, TokenPair } from "./token-storage";

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface QueuedRequest {
  id: string;
  resolve: (token: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Token refresh manager with request queuing
 */
export class TokenRefreshManager {
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;
  private requestQueue: QueuedRequest[] = [];
  private refreshListeners: Array<(tokens: TokenPair) => void> = [];
  private errorListeners: Array<(error: Error) => void> = [];
  private readonly maxQueueSize = 100;
  private readonly queueTimeout = 30000; // 30 seconds

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string> {
    const currentToken = tokenStorage.getAccessToken();

    // If we have a valid token that's not expiring soon, return it
    if (
      currentToken &&
      tokenStorage.isAccessTokenValid() &&
      !tokenStorage.isAccessTokenExpiringSoon()
    ) {
      return currentToken;
    }

    // If we're already refreshing, queue this request
    if (this.isRefreshing && this.refreshPromise) {
      return this.queueRequest();
    }

    // Start token refresh
    return this.refreshTokens();
  }

  /**
   * Queue a request while token refresh is in progress
   */
  private async queueRequest(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check queue size limit
      if (this.requestQueue.length >= this.maxQueueSize) {
        reject(new Error("Token refresh queue is full"));
        return;
      }

      const requestId = this.generateRequestId();
      const queuedRequest: QueuedRequest = {
        id: requestId,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.requestQueue.push(queuedRequest);

      // Set timeout for queued request
      setTimeout(() => {
        const index = this.requestQueue.findIndex(
          (req) => req.id === requestId,
        );
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error("Token refresh request timed out"));
        }
      }, this.queueTimeout);
    });
  }

  /**
   * Refresh tokens with atomic updates
   */
  private async refreshTokens(): Promise<string> {
    // If already refreshing, return the existing promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    this.refreshPromise = this.performTokenRefresh()
      .then((newAccessToken) => {
        // Process queued requests
        this.processQueue(newAccessToken);
        return newAccessToken;
      })
      .catch((error) => {
        // Reject all queued requests
        this.rejectQueue(error);
        throw error;
      })
      .finally(() => {
        // Reset refresh state
        this.isRefreshing = false;
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Perform the actual token refresh API call
   */
  private async performTokenRefresh(): Promise<string> {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      const error = new Error("No refresh token available");
      this.notifyError(error);
      throw error;
    }

    try {
      // Call auth service to refresh tokens
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Refresh token is invalid, clear all tokens
          await tokenStorage.clearTokens();
          const error = new Error("Refresh token expired");
          this.notifyError(error);
          throw error;
        }

        const error = new Error(`Token refresh failed: ${response.status}`);
        this.notifyError(error);
        throw error;
      }

      const data: RefreshTokenResponse = await response.json();

      // Store new tokens with atomic update
      const newTokenPair: TokenPair = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
      };

      await tokenStorage.storeTokens(newTokenPair);

      // Notify listeners of successful refresh
      this.notifyRefresh(newTokenPair);

      console.log("Tokens refreshed successfully");
      return data.accessToken;
    } catch (error) {
      console.error("Token refresh failed:", error);

      // If refresh fails, clear tokens to force re-authentication
      await tokenStorage.clearTokens();

      const refreshError =
        error instanceof Error ? error : new Error("Token refresh failed");
      this.notifyError(refreshError);
      throw refreshError;
    }
  }

  /**
   * Process all queued requests with the new token
   */
  private processQueue(newAccessToken: string): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    queue.forEach((request) => {
      try {
        request.resolve(newAccessToken);
      } catch (error) {
        console.error("Error processing queued request:", error);
      }
    });

    console.log(`Processed ${queue.length} queued requests`);
  }

  /**
   * Reject all queued requests with error
   */
  private rejectQueue(error: Error): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    queue.forEach((request) => {
      try {
        request.reject(error);
      } catch (rejectionError) {
        console.error("Error rejecting queued request:", rejectionError);
      }
    });

    console.log(`Rejected ${queue.length} queued requests`);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add listener for token refresh events
   */
  onTokenRefresh(callback: (tokens: TokenPair) => void): () => void {
    this.refreshListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.refreshListeners.indexOf(callback);
      if (index !== -1) {
        this.refreshListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add listener for refresh error events
   */
  onRefreshError(callback: (error: Error) => void): () => void {
    this.errorListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index !== -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of successful token refresh
   */
  private notifyRefresh(tokens: TokenPair): void {
    this.refreshListeners.forEach((callback) => {
      try {
        callback(tokens);
      } catch (error) {
        console.error("Error in token refresh listener:", error);
      }
    });
  }

  /**
   * Notify listeners of refresh errors
   */
  private notifyError(error: Error): void {
    this.errorListeners.forEach((callback) => {
      try {
        callback(error);
      } catch (listenerError) {
        console.error("Error in refresh error listener:", listenerError);
      }
    });
  }

  /**
   * Force token refresh (useful for testing or manual refresh)
   */
  async forceRefresh(): Promise<string> {
    // Clear current tokens to force refresh
    tokenStorage.clearTokens();
    return this.refreshTokens();
  }

  /**
   * Check if token refresh is currently in progress
   */
  isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.requestQueue.length;
  }

  /**
   * Clear all queued requests (useful for cleanup)
   */
  clearQueue(): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    const error = new Error("Queue cleared");
    queue.forEach((request) => {
      try {
        request.reject(error);
      } catch (rejectionError) {
        console.error("Error clearing queued request:", rejectionError);
      }
    });
  }

  /**
   * Get refresh manager status for debugging
   */
  getStatus(): {
    isRefreshing: boolean;
    queueSize: number;
    hasRefreshToken: boolean;
    hasAccessToken: boolean;
    isAccessTokenValid: boolean;
  } {
    return {
      isRefreshing: this.isRefreshing,
      queueSize: this.requestQueue.length,
      hasRefreshToken: !!tokenStorage.getRefreshToken(),
      hasAccessToken: !!tokenStorage.getAccessToken(),
      isAccessTokenValid: tokenStorage.isAccessTokenValid(),
    };
  }
}

// Singleton instance for global use
export const tokenRefreshManager = new TokenRefreshManager();

/**
 * Hook for using token refresh in React components
 */
export function useTokenRefresh() {
  const getValidToken = async (): Promise<string> => {
    return tokenRefreshManager.getValidAccessToken();
  };

  const forceRefresh = async (): Promise<string> => {
    return tokenRefreshManager.forceRefresh();
  };

  const isRefreshing = (): boolean => {
    return tokenRefreshManager.isRefreshInProgress();
  };

  const getStatus = () => {
    return tokenRefreshManager.getStatus();
  };

  return {
    getValidToken,
    forceRefresh,
    isRefreshing,
    getStatus,
    onTokenRefresh:
      tokenRefreshManager.onTokenRefresh.bind(tokenRefreshManager),
    onRefreshError:
      tokenRefreshManager.onRefreshError.bind(tokenRefreshManager),
  };
}
