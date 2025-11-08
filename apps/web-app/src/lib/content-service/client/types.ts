/**
 * Content Service Client Types
 *
 * Configuration and dependency injection types for the client
 */

import type { ContentServiceConfig } from "../../../types/config";

export type ContentServiceClientConfig = ContentServiceConfig;

export interface ContentServiceClientDependencies {
  httpClient?: unknown;
  cacheProvider?: unknown;
  webSocketClient?: unknown;
  authProvider?: unknown;
  metricsCollector?: unknown;
  logger?: unknown;
}
