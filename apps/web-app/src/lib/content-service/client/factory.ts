/**
 * Content Service Client Factory
 *
 * Factory functions for creating client instances
 */

import { ContentServiceClient } from "./content-service-client";
import type {
  ContentServiceClientConfig,
} from "./types";
import { contentServiceConfig } from "../../config/content-service";

/**
 * Singleton instance
 */
export const contentServiceClient = new ContentServiceClient(
  contentServiceConfig,
);

/**
 * Creates a new content service client with dependency injection support
 */
export function createContentServiceClient(
  config?: ContentServiceClientConfig,
): ContentServiceClient {
  return new ContentServiceClient(config);
}

/**
 * Creates a mock content service client for testing
 */
export function createMockContentServiceClient(): ContentServiceClient {
  return new ContentServiceClient({
    baseURL: "http://localhost:3004",
    timeout: 5000,
    retryAttempts: 0,
    retryDelay: 100,
    circuitBreakerThreshold: 10,
    circuitBreakerTimeout: 5000,
    enableRequestLogging: false,
    enableMetrics: false,
    enableCaching: false,
    enableWebSocket: false,
  });
}
