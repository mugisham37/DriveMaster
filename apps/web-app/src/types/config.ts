/**
 * Content Service Configuration Types
 * 
 * Configuration interfaces for content service client and related components
 */

// ============================================================================
// HTTP Client Configuration
// ============================================================================

export interface HttpClientConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  enableRequestLogging: boolean
  enableResponseLogging: boolean
  maxConcurrentRequests: number
  requestInterceptors?: Array<(config: unknown) => unknown>
  responseInterceptors?: Array<(response: unknown) => unknown>
}

// ============================================================================
// Cache Configuration
// ============================================================================

export interface CacheConfig {
  defaultTTL: number
  searchTTL: number
  mediaTTL: number
  maxCacheSize: number
  enableCompression: boolean
  revalidateOnFocus: boolean
  revalidateOnReconnect: boolean
  dedupingInterval: number
  errorRetryCount: number
  errorRetryInterval: number
}

// ============================================================================
// Circuit Breaker Configuration
// ============================================================================

export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
  halfOpenMaxCalls: number
  enableMetrics: boolean
}

// ============================================================================
// Upload Configuration
// ============================================================================

export interface UploadConfig {
  maxFileSize: number
  allowedMimeTypes: string[]
  chunkSize: number
  maxConcurrentUploads: number
  enableCompression: boolean
  enableThumbnailGeneration: boolean
  thumbnailSizes: Array<{ width: number; height: number }>
  enableProgressTracking: boolean
}

// ============================================================================
// Search Configuration
// ============================================================================

export interface SearchConfig {
  defaultPageSize: number
  maxPageSize: number
  enableHighlighting: boolean
  enableFaceting: boolean
  enableSuggestions: boolean
  suggestionMinLength: number
  debounceDelay: number
  maxSuggestions: number
}

// ============================================================================
// WebSocket Configuration
// ============================================================================

export interface WebSocketConfig {
  url: string
  reconnectAttempts: number
  reconnectDelay: number
  heartbeatInterval: number
  enableCompression: boolean
  enablePresence: boolean
  presenceUpdateInterval: number
}

// ============================================================================
// Performance Configuration
// ============================================================================

export interface PerformanceConfig {
  enableMetrics: boolean
  enableProfiling: boolean
  metricsReportingInterval: number
  slowRequestThreshold: number
  enableRequestTracing: boolean
  tracingSampleRate: number
}

// ============================================================================
// Security Configuration
// ============================================================================

export interface SecurityConfig {
  enableRequestSigning: boolean
  signingSecret?: string
  enableCSRFProtection: boolean
  allowedOrigins: string[]
  enableRateLimiting: boolean
  rateLimitRequests: number
  rateLimitWindow: number
}

// ============================================================================
// Main Content Service Configuration
// ============================================================================

export interface ContentServiceConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
  enableRequestLogging: boolean
  enableMetrics: boolean
  enableCaching: boolean
  enableWebSocket: boolean
}

// ============================================================================
// Environment-specific Configuration
// ============================================================================

export interface EnvironmentConfig {
  contentService: ContentServiceConfig
  cache: CacheConfig
  upload: UploadConfig
  search: SearchConfig
  webSocket?: WebSocketConfig
  performance: PerformanceConfig
  security: SecurityConfig
  isDevelopment: boolean
  isProduction: boolean
}

// ============================================================================
// Feature Flags
// ============================================================================

export interface FeatureFlags {
  enableRealTimeUpdates: boolean
  enableBulkOperations: boolean
  enableAdvancedSearch: boolean
  enableMediaOptimization: boolean
  enableCollaboration: boolean
  enableWorkflowManagement: boolean
  enableAnalytics: boolean
  enableA11yFeatures: boolean
}

// ============================================================================
// Client Dependencies Configuration
// ============================================================================

export interface ClientDependencies {
  httpClient?: unknown
  cacheProvider?: unknown
  webSocketClient?: unknown
  authProvider?: unknown
  metricsCollector?: unknown
  logger?: unknown
}

// ============================================================================
// Monitoring Configuration
// ============================================================================

export interface MonitoringConfig {
  enableHealthChecks: boolean
  healthCheckInterval: number
  enableAlerts: boolean
  alertThresholds: {
    errorRate: number
    responseTime: number
    availability: number
  }
  enableDashboard: boolean
  metricsRetention: number
}