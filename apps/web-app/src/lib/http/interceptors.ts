/**
 * HTTP Client Interceptors
 * Handles token injection, metadata headers, request signing, token refresh, and error handling
 */

import {
  httpClient,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "./client";
import { config } from "../config/environment";

/**
 * Token storage interface
 */
interface TokenStorage {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
  isTokenExpired(token: string): boolean;
}

/**
 * Simple in-memory token storage (will be replaced with proper implementation)
 */
class MemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async getAccessToken(): Promise<string | null> {
    return this.accessToken;
  }

  async getRefreshToken(): Promise<string | null> {
    return this.refreshToken;
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
  }

  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split(".");
      if (parts.length !== 3 || !parts[1]) return true;

      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp - 30000; // Consider expired 30 seconds before actual expiry
    } catch {
      return true;
    }
  }
}

// Global token storage instance
const tokenStorage = new MemoryTokenStorage();

/**
 * Request queue for handling concurrent requests during token refresh
 */
class RequestQueue {
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;
  private queue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
  }> = [];

  async getValidToken(): Promise<string | null> {
    const accessToken = await tokenStorage.getAccessToken();

    if (!accessToken) {
      return null;
    }

    if (!tokenStorage.isTokenExpired(accessToken)) {
      return accessToken;
    }

    // Token is expired, need to refresh
    if (this.isRefreshing) {
      // Wait for ongoing refresh
      return new Promise((resolve, reject) => {
        this.queue.push({ resolve, reject });
      });
    }

    // Start token refresh
    this.isRefreshing = true;
    this.refreshPromise = this.refreshToken();

    try {
      await this.refreshPromise;
      const newToken = await tokenStorage.getAccessToken();

      // Resolve all queued requests
      this.queue.forEach(({ resolve }) => resolve(newToken));
      this.queue = [];

      return newToken;
    } catch (error) {
      // Reject all queued requests
      this.queue.forEach(({ reject }) => reject(error));
      this.queue = [];

      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = await tokenStorage.getRefreshToken();

    if (!refreshToken) {
      await tokenStorage.clearTokens();
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch(
        `${config.authService.baseUrl}/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshToken}`,
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
    } catch (error) {
      await tokenStorage.clearTokens();
      throw error;
    }
  }
}

const requestQueue = new RequestQueue();

/**
 * Request Interceptor: Token Injection and Metadata Headers
 */
const tokenInjectionInterceptor: RequestInterceptor = async (config) => {
  // Skip token injection if explicitly requested
  if (config.skipAuth) {
    return config;
  }

  try {
    const token = await requestQueue.getValidToken();

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  } catch (error) {
    console.warn("Failed to inject token:", error);
    // Continue without token - let the server handle authentication
  }

  // Add metadata headers
  config.headers = {
    ...config.headers,
    "X-Client-Platform": "web",
    "X-Client-Version": "1.0.0",
    "X-User-Agent":
      typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
    "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    "X-Language":
      typeof navigator !== "undefined" ? navigator.language : "en-US",
  };

  return config;
};

/**
 * Request Interceptor: Request Signing
 */
const requestSigningInterceptor: RequestInterceptor = async (config) => {
  if (!config.security?.requestSigning || !config.security.signingSecret) {
    return config;
  }

  const headers = config.headers || {};
  const timestamp = headers["X-Timestamp"] || new Date().toISOString();
  const correlationId = headers["X-Correlation-ID"] || "unknown";
  const body = config.body ? JSON.stringify(config.body) : "";

  try {
    const message = `${config.method}|${config.url}|${body}|${timestamp}|${correlationId}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(config.security.signingSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(message),
    );
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    config.headers = {
      ...headers,
      "X-Signature": signatureHex,
    };
  } catch (error) {
    console.warn("Failed to sign request:", error);
  }

  return config;
};

/**
 * Response Interceptor: Token Refresh Detection
 */
const tokenRefreshInterceptor: ResponseInterceptor = async (response) => {
  // Check if response contains new tokens
  const newAccessToken = response.headers.get("X-New-Access-Token");
  const newRefreshToken = response.headers.get("X-New-Refresh-Token");

  if (newAccessToken && newRefreshToken) {
    await tokenStorage.setTokens(newAccessToken, newRefreshToken);
  }

  return response;
};

/**
 * Response Interceptor: Circuit Breaker State Updates
 */
const circuitBreakerInterceptor: ResponseInterceptor = async (response) => {
  // Log circuit breaker state for monitoring
  const circuitState = httpClient.getCircuitBreakerState();

  if (circuitState.state !== "closed") {
    console.log("Circuit breaker state:", circuitState);
  }

  // Add circuit breaker state to response headers for debugging
  if (config.isDevelopment) {
    response.headers.set("X-Circuit-Breaker-State", circuitState.state);
    response.headers.set(
      "X-Circuit-Breaker-Failures",
      circuitState.failureCount.toString(),
    );
  }

  return response;
};

/**
 * Error Interceptor: Authentication Error Handling
 */
const authErrorInterceptor: ErrorInterceptor = async (error) => {
  if (error.type === "authentication" && error.status === 401) {
    // Clear tokens on authentication failure
    await tokenStorage.clearTokens();

    // Redirect to login if in browser
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(
        currentPath,
      )}`;
    }
  }

  return error;
};

/**
 * Error Interceptor: Enhanced Error Messages
 */
const errorEnhancementInterceptor: ErrorInterceptor = async (error) => {
  // Enhance error messages based on type
  switch (error.type) {
    case "network":
      error.message =
        "Unable to connect to the server. Please check your internet connection.";
      break;
    case "timeout":
      error.message = "Request timed out. Please try again.";
      break;
    case "authentication":
      error.message = "Authentication failed. Please sign in again.";
      break;
    case "authorization":
      error.message = "You don't have permission to perform this action.";
      break;
    case "validation":
      error.message =
        error.details &&
        typeof error.details === "object" &&
        "message" in error.details &&
        typeof error.details.message === "string"
          ? error.details.message
          : "Invalid input data. Please check your information.";
      break;
    case "server":
      error.message = "Server error occurred. Please try again later.";
      break;
  }

  // Add recovery suggestions
  switch (error.type) {
    case "network":
    case "timeout":
      error.recoverable = true;
      break;
    case "authentication":
      error.recoverable = false;
      break;
    case "server":
      error.recoverable = true;
      error.retryAfter = error.retryAfter || 5000;
      break;
  }

  return error;
};

/**
 * Error Interceptor: Logging
 */
const errorLoggingInterceptor: ErrorInterceptor = async (error) => {
  // Log errors for debugging (sanitize sensitive data)
  const logData = {
    type: error.type,
    message: error.message,
    code: error.code,
    status: error.status,
    correlationId: error.correlationId,
    timestamp: new Date().toISOString(),
  };

  if (config.isDevelopment) {
    console.error("API Error:", logData);
  } else {
    // In production, send to logging service
    console.error(
      "API Error:",
      logData.correlationId,
      logData.type,
      logData.message,
    );
  }

  return error;
};

/**
 * Initialize all interceptors
 */
export function initializeInterceptors(): void {
  // Request interceptors (order matters)
  httpClient.addRequestInterceptor(tokenInjectionInterceptor);
  httpClient.addRequestInterceptor(requestSigningInterceptor);

  // Response interceptors
  httpClient.addResponseInterceptor(tokenRefreshInterceptor);
  httpClient.addResponseInterceptor(circuitBreakerInterceptor);

  // Error interceptors (order matters)
  httpClient.addErrorInterceptor(authErrorInterceptor);
  httpClient.addErrorInterceptor(errorEnhancementInterceptor);
  httpClient.addErrorInterceptor(errorLoggingInterceptor);
}

/**
 * Export token storage for use by other modules
 */
export { tokenStorage, requestQueue };

/**
 * Utility functions for token management
 */
export const tokenUtils = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await tokenStorage.setTokens(accessToken, refreshToken);
  },

  async clearTokens(): Promise<void> {
    await tokenStorage.clearTokens();
  },

  async getAccessToken(): Promise<string | null> {
    return tokenStorage.getAccessToken();
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await tokenStorage.getAccessToken();
    return token !== null && !tokenStorage.isTokenExpired(token);
  },
};
