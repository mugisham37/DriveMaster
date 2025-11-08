"use client";

/**
 * Cross-Tab Synchronization Test Utilities
 *
 * Provides utilities to test and verify cross-tab authentication synchronization
 * This file can be used for development and testing purposes
 */

import { crossTabSync } from "./cross-tab-sync";
import { integratedTokenManager } from "./token-manager";
import type { TokenPair } from "./token-storage";

export interface CrossTabTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Test cross-tab login synchronization
 */
export async function testCrossTabLogin(): Promise<CrossTabTestResult> {
  try {
    // Mock tokens for testing
    const mockTokens: TokenPair = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresIn: 3600,
    };

    const mockUser = {
      id: 1,
      handle: "test-user",
      email: "test@example.com",
      name: "Test User",
    };

    // Broadcast login event
    await crossTabSync.broadcastLogin(mockTokens, mockUser);

    return {
      success: true,
      message: "Cross-tab login broadcast successful",
      details: { tokens: mockTokens, user: mockUser },
    };
  } catch (error) {
    return {
      success: false,
      message: `Cross-tab login test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Test cross-tab logout synchronization
 */
export async function testCrossTabLogout(): Promise<CrossTabTestResult> {
  try {
    // Broadcast logout event
    await crossTabSync.broadcastLogout();

    return {
      success: true,
      message: "Cross-tab logout broadcast successful",
    };
  } catch (error) {
    return {
      success: false,
      message: `Cross-tab logout test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Test cross-tab token refresh synchronization
 */
export async function testCrossTabTokenRefresh(): Promise<CrossTabTestResult> {
  try {
    // Mock refreshed tokens
    const mockTokens: TokenPair = {
      accessToken: "refreshed-access-token",
      refreshToken: "refreshed-refresh-token",
      expiresIn: 3600,
    };

    // Broadcast token refresh event
    await crossTabSync.broadcastTokenRefresh(mockTokens);

    return {
      success: true,
      message: "Cross-tab token refresh broadcast successful",
      details: { tokens: mockTokens },
    };
  } catch (error) {
    return {
      success: false,
      message: `Cross-tab token refresh test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Test BroadcastChannel support
 */
export function testBroadcastChannelSupport(): CrossTabTestResult {
  const isSupported = crossTabSync.isSupported();
  const status = crossTabSync.getStatus();

  return {
    success: isSupported,
    message: isSupported
      ? "BroadcastChannel is supported and initialized"
      : "BroadcastChannel is not supported, using fallback",
    details: status,
  };
}

/**
 * Test token manager integration
 */
export function testTokenManagerIntegration(): CrossTabTestResult {
  try {
    const status = integratedTokenManager.getStatus();

    return {
      success: status.isInitialized,
      message: status.isInitialized
        ? "Token manager is properly initialized"
        : "Token manager is not initialized",
      details: status,
    };
  } catch (error) {
    return {
      success: false,
      message: `Token manager integration test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Run comprehensive cross-tab synchronization tests
 */
export async function runCrossTabSyncTests(): Promise<{
  overall: boolean;
  results: Record<string, CrossTabTestResult>;
}> {
  const results: Record<string, CrossTabTestResult> = {};

  // Test BroadcastChannel support
  results.broadcastChannelSupport = testBroadcastChannelSupport();

  // Test token manager integration
  results.tokenManagerIntegration = testTokenManagerIntegration();

  // Test cross-tab login (only if supported)
  if (results.broadcastChannelSupport.success) {
    results.crossTabLogin = await testCrossTabLogin();
    results.crossTabLogout = await testCrossTabLogout();
    results.crossTabTokenRefresh = await testCrossTabTokenRefresh();
  }

  // Determine overall success
  const overall = Object.values(results).every((result) => result.success);

  return { overall, results };
}

/**
 * Development helper to log test results
 */
export async function logCrossTabSyncTests(): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    console.warn("Cross-tab sync tests should only be run in development mode");
    return;
  }

  console.group("🔄 Cross-Tab Synchronization Tests");

  const { overall, results } = await runCrossTabSyncTests();

  console.log(`Overall Status: ${overall ? "✅ PASS" : "❌ FAIL"}`);
  console.log("");

  Object.entries(results).forEach(([testName, result]) => {
    console.log(
      `${result.success ? "✅" : "❌"} ${testName}: ${result.message}`,
    );
    if (result.details) {
      console.log("  Details:", result.details);
    }
  });

  console.groupEnd();
}

/**
 * Add message listener for testing purposes
 */
export function addTestMessageListener(): () => void {
  const listener = (message: import("./cross-tab-sync").AuthSyncMessage) => {
    console.log("🔄 Cross-tab message received:", message);
  };

  return crossTabSync.addMessageListener(listener);
}

// Export for development use
if (process.env.NODE_ENV === "development") {
  // Make test functions available globally for browser console testing
  if (typeof window !== "undefined") {
    interface CrossTabSyncTests {
      runTests: typeof runCrossTabSyncTests;
      logTests: typeof logCrossTabSyncTests;
      testLogin: typeof testCrossTabLogin;
      testLogout: typeof testCrossTabLogout;
      testTokenRefresh: typeof testCrossTabTokenRefresh;
      addListener: typeof addTestMessageListener;
    }

    (
      window as typeof window & { crossTabSyncTests: CrossTabSyncTests }
    ).crossTabSyncTests = {
      runTests: runCrossTabSyncTests,
      logTests: logCrossTabSyncTests,
      testLogin: testCrossTabLogin,
      testLogout: testCrossTabLogout,
      testTokenRefresh: testCrossTabTokenRefresh,
      addListener: addTestMessageListener,
    };
  }
}
