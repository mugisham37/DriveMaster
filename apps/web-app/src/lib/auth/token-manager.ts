"use client";

/**
 * Integrated Token Management System
 *
 * Combines token storage, refresh, and cross-tab synchronization
 * into a unified interface for the authentication system
 */

import { tokenStorage, TokenPair } from "./token-storage";
import { tokenRefreshManager } from "./token-refresh";
import { crossTabSync } from "./cross-tab-sync";
import { useEffect, useCallback } from "react";

export interface TokenManagerEvents {
  onTokenRefresh?: (tokens: TokenPair) => void;
  onTokenExpired?: () => void;
  onCrossTabLogin?: (tokens: TokenPair, user: Record<string, unknown>) => void;
  onCrossTabLogout?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Integrated token manager class
 */
export class IntegratedTokenManager {
  private events: TokenManagerEvents = {};
  private isInitialized = false;

  /**
   * Initialize the token manager with event listeners
   */
  initialize(events: TokenManagerEvents = {}): void {
    if (this.isInitialized) return;

    this.events = events;

    // Set up token refresh listeners
    tokenRefreshManager.onTokenRefresh((tokens) => {
      // Broadcast token refresh to other tabs
      crossTabSync.broadcastTokenRefresh(tokens);

      // Notify local listeners
      this.events.onTokenRefresh?.(tokens);
    });

    tokenRefreshManager.onRefreshError((error) => {
      if (error.message.includes("expired")) {
        // Broadcast session expiration to other tabs
        crossTabSync.broadcastSessionExpired();

        // Notify local listeners
        this.events.onTokenExpired?.();
      }

      this.events.onError?.(error);
    });

    // Set up cross-tab sync listeners
    crossTabSync.addMessageListener((message) => {
      switch (message.type) {
        case "LOGIN":
          if (
            message.payload &&
            typeof message.payload === "object" &&
            "tokens" in message.payload &&
            "user" in message.payload
          ) {
            this.events.onCrossTabLogin?.(
              message.payload.tokens as TokenPair,
              message.payload.user as Record<string, unknown>,
            );
          }
          break;
        case "LOGOUT":
          this.events.onCrossTabLogout?.();
          break;
        case "SESSION_EXPIRED":
          this.events.onTokenExpired?.();
          break;
      }
    });

    this.isInitialized = true;
    console.log("Integrated token manager initialized");
  }

  /**
   * Store tokens and broadcast login to other tabs
   */
  async storeTokens(
    tokens: TokenPair,
    user?: Record<string, unknown>,
  ): Promise<void> {
    await tokenStorage.storeTokens(tokens);

    if (user) {
      await crossTabSync.broadcastLogin(tokens, user);
    }
  }

  /**
   * Get valid access token (with automatic refresh)
   */
  async getValidAccessToken(): Promise<string> {
    return tokenRefreshManager.getValidAccessToken();
  }

  /**
   * Clear all tokens and broadcast logout to other tabs
   */
  async clearTokens(): Promise<void> {
    await tokenStorage.clearTokens();
    await crossTabSync.broadcastLogout();
  }

  /**
   * Force token refresh
   */
  async forceRefresh(): Promise<string> {
    return tokenRefreshManager.forceRefresh();
  }

  /**
   * Get current token information
   */
  getTokenInfo() {
    return tokenStorage.getTokenInfo();
  }

  /**
   * Check if access token is valid
   */
  isAccessTokenValid(): boolean {
    return tokenStorage.isAccessTokenValid();
  }

  /**
   * Get refresh manager status
   */
  getRefreshStatus() {
    return tokenRefreshManager.getStatus();
  }

  /**
   * Get cross-tab sync status
   */
  getCrossTabStatus() {
    return crossTabSync.getStatus();
  }

  /**
   * Get comprehensive status for debugging
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      tokenInfo: this.getTokenInfo(),
      refreshStatus: this.getRefreshStatus(),
      crossTabStatus: this.getCrossTabStatus(),
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    crossTabSync.cleanup();
    this.isInitialized = false;
  }
}

// Singleton instance
export const integratedTokenManager = new IntegratedTokenManager();

/**
 * React hook for integrated token management
 */
export function useTokenManager(events: TokenManagerEvents = {}) {
  useEffect(() => {
    integratedTokenManager.initialize(events);

    return () => {
      // Cleanup is handled by the singleton
    };
  }, [events]);

  const storeTokens = useCallback(
    async (tokens: TokenPair, user?: Record<string, unknown>) => {
      return integratedTokenManager.storeTokens(tokens, user);
    },
    [],
  );

  const getValidAccessToken = useCallback(async () => {
    return integratedTokenManager.getValidAccessToken();
  }, []);

  const clearTokens = useCallback(async () => {
    return integratedTokenManager.clearTokens();
  }, []);

  const forceRefresh = useCallback(async () => {
    return integratedTokenManager.forceRefresh();
  }, []);

  const getTokenInfo = useCallback(() => {
    return integratedTokenManager.getTokenInfo();
  }, []);

  const isAccessTokenValid = useCallback(() => {
    return integratedTokenManager.isAccessTokenValid();
  }, []);

  const getStatus = useCallback(() => {
    return integratedTokenManager.getStatus();
  }, []);

  return {
    storeTokens,
    getValidAccessToken,
    clearTokens,
    forceRefresh,
    getTokenInfo,
    isAccessTokenValid,
    getStatus,
  };
}

/**
 * Higher-order component for token management
 * Note: Use the useTokenManager hook directly in components for better TypeScript support
 */
