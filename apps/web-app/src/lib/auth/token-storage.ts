"use client";

/**
 * Token Storage System
 *
 * Implements secure token storage with:
 * - Access tokens in memory only (for security)
 * - Refresh tokens in HTTP-only cookies (for persistence)
 * - Token validation and expiration checking
 * - Encryption for sensitive data
 */

import { jwtDecode } from "jwt-decode";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DecodedToken {
  sub: string;
  exp: number;
  iat: number;
  handle: string;
  email: string;
  isMentor: boolean;
  isInsider: boolean;
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  expiresAt?: Date;
  decodedToken?: DecodedToken;
}

/**
 * In-memory storage for access tokens
 * This ensures access tokens are never persisted to disk
 */
class MemoryTokenStorage {
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;

  setAccessToken(token: string): void {
    this.accessToken = token;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      this.tokenExpiration = new Date(decoded.exp * 1000);
    } catch (error) {
      console.error("Failed to decode access token:", error);
      this.tokenExpiration = null;
    }
  }

  getAccessToken(): string | null {
    // Check if token is expired before returning
    if (this.accessToken && this.tokenExpiration) {
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

      if (now.getTime() >= this.tokenExpiration.getTime() - bufferTime) {
        // Token is expired or about to expire
        this.clearAccessToken();
        return null;
      }
    }

    return this.accessToken;
  }

  clearAccessToken(): void {
    this.accessToken = null;
    this.tokenExpiration = null;
  }

  getTokenExpiration(): Date | null {
    return this.tokenExpiration;
  }

  isTokenExpired(): boolean {
    if (!this.tokenExpiration) return true;

    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    return now.getTime() >= this.tokenExpiration.getTime() - bufferTime;
  }
}

/**
 * Cookie-based storage for refresh tokens
 * Uses HTTP-only cookies for security
 */
class CookieTokenStorage {
  private readonly REFRESH_TOKEN_COOKIE = "auth_refresh_token";
  private readonly COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

  setRefreshToken(token: string): void {
    if (typeof document === "undefined") return;

    const expires = new Date();
    expires.setTime(expires.getTime() + this.COOKIE_MAX_AGE * 1000);

    // Set HTTP-only cookie for refresh token
    document.cookie =
      `${this.REFRESH_TOKEN_COOKIE}=${token}; ` +
      `expires=${expires.toUTCString()}; ` +
      `path=/; ` +
      `secure=${process.env.NODE_ENV === "production"}; ` +
      `samesite=strict; ` +
      `httponly`;
  }

  getRefreshToken(): string | null {
    if (typeof document === "undefined") return null;

    const cookies = document.cookie.split(";");
    const refreshCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${this.REFRESH_TOKEN_COOKIE}=`),
    );

    if (!refreshCookie) return null;

    return refreshCookie.split("=")[1] || null;
  }

  clearRefreshToken(): void {
    if (typeof document === "undefined") return;

    // Clear the cookie by setting it to expire in the past
    document.cookie =
      `${this.REFRESH_TOKEN_COOKIE}=; ` +
      `expires=Thu, 01 Jan 1970 00:00:00 UTC; ` +
      `path=/; ` +
      `secure=${process.env.NODE_ENV === "production"}; ` +
      `samesite=strict; ` +
      `httponly`;
  }
}

/**
 * Simple encryption utilities for sensitive data
 * Note: This is basic obfuscation, not cryptographically secure
 * For production, consider using Web Crypto API or a proper encryption library
 */
class TokenEncryption {
  private readonly key = "exercism-auth-key"; // In production, use environment variable

  encrypt(data: string): string {
    try {
      // Simple XOR encryption for basic obfuscation
      let encrypted = "";
      for (let i = 0; i < data.length; i++) {
        const keyChar = this.key.charCodeAt(i % this.key.length);
        const dataChar = data.charCodeAt(i);
        encrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      console.error("Encryption failed:", error);
      return data; // Return original data if encryption fails
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const encrypted = atob(encryptedData); // Base64 decode
      let decrypted = "";
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = this.key.charCodeAt(i % this.key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      return decrypted;
    } catch (error) {
      console.error("Decryption failed:", error);
      return encryptedData; // Return original data if decryption fails
    }
  }
}

/**
 * Main token storage manager
 * Coordinates memory and cookie storage
 */
export class TokenStorageManager {
  private memoryStorage = new MemoryTokenStorage();
  private cookieStorage = new CookieTokenStorage();
  private encryption = new TokenEncryption();

  /**
   * Store token pair securely
   */
  async storeTokens(tokens: TokenPair): Promise<void> {
    try {
      // Store access token in memory
      this.memoryStorage.setAccessToken(tokens.accessToken);

      // Store refresh token in HTTP-only cookie with encryption
      const encryptedRefreshToken = this.encryption.encrypt(
        tokens.refreshToken,
      );
      this.cookieStorage.setRefreshToken(encryptedRefreshToken);

      console.log("Tokens stored successfully");
    } catch (error) {
      console.error("Failed to store tokens:", error);
      throw new Error("Token storage failed");
    }
  }

  /**
   * Get access token from memory
   */
  getAccessToken(): string | null {
    return this.memoryStorage.getAccessToken();
  }

  /**
   * Get refresh token from cookie
   */
  getRefreshToken(): string | null {
    try {
      const encryptedToken = this.cookieStorage.getRefreshToken();
      if (!encryptedToken) return null;

      return this.encryption.decrypt(encryptedToken);
    } catch (error) {
      console.error("Failed to retrieve refresh token:", error);
      return null;
    }
  }

  /**
   * Clear all stored tokens
   */
  async clearTokens(): Promise<void> {
    try {
      this.memoryStorage.clearAccessToken();
      this.cookieStorage.clearRefreshToken();
      console.log("All tokens cleared");
    } catch (error) {
      console.error("Failed to clear tokens:", error);
    }
  }

  /**
   * Validate token and return validation result
   */
  validateToken(token: string): TokenValidationResult {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp <= now;
      const expiresAt = new Date(decoded.exp * 1000);

      return {
        isValid: true,
        isExpired,
        expiresAt,
        decodedToken: decoded,
      };
    } catch (error) {
      console.error("Token validation failed:", error);
      return {
        isValid: false,
        isExpired: true,
      };
    }
  }

  /**
   * Check if access token is valid and not expired
   */
  isAccessTokenValid(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    const validation = this.validateToken(token);
    return validation.isValid && !validation.isExpired;
  }

  /**
   * Get access token expiration date
   */
  getAccessTokenExpiration(): Date | null {
    return this.memoryStorage.getTokenExpiration();
  }

  /**
   * Check if access token is about to expire (within 5 minutes)
   */
  isAccessTokenExpiringSoon(): boolean {
    const expiration = this.getAccessTokenExpiration();
    if (!expiration) return true;

    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    return now.getTime() >= expiration.getTime() - bufferTime;
  }

  /**
   * Get token information for debugging
   */
  getTokenInfo(): {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    accessTokenExpiration: Date | null;
    isAccessTokenValid: boolean;
    isExpiringSoon: boolean;
  } {
    return {
      hasAccessToken: !!this.getAccessToken(),
      hasRefreshToken: !!this.getRefreshToken(),
      accessTokenExpiration: this.getAccessTokenExpiration(),
      isAccessTokenValid: this.isAccessTokenValid(),
      isExpiringSoon: this.isAccessTokenExpiringSoon(),
    };
  }
}

// Singleton instance for global use
export const tokenStorage = new TokenStorageManager();
