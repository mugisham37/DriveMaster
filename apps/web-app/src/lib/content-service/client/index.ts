/**
 * Content Service Client - Main Export File
 *
 * Exports the main ContentServiceClient class and factory functions
 */

export { ContentServiceClient } from "./content-service-client";
export {
  contentServiceClient,
  createContentServiceClient,
  createMockContentServiceClient,
} from "./factory";
export type {
  ContentServiceClientConfig,
  ContentServiceClientDependencies,
} from "./types";
