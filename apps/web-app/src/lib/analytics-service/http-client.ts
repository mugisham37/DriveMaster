/**
 * HTTP REST Client for Analytics Service Integration
 *
 * Implements:
 * - Axios instance with analytics-dashboard service base URL configuration
 * - JWT token injection using existing auth-service integration
 * - Request/response interceptors for correlation IDs and error handling
 * - Retry logic with exponential backoff for transient failures
 * - Circuit breaker pattern for fault tolerance
 * - Requirements: 2.1, 2.2, 7.1
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

// Extend Axios types to include metadata
declare module "axios" {
  interface InternalAxiosRequestConfig {
    metadata?: {
      correlationId?: string;
      requestStartTime?: number;
      retryCount?: number;
    };
  }
}

import { integratedTokenManager } from "@/lib/auth/token-manager";
import {
  analyticsServiceConfig,
  createCorrelationId,
} from "@/lib/config/analytics-service";
import {
  transformApiResponse,
  transformApiRequest,
  transformErrorResponse,
} from "./data-transform";
import type {
  ApiResponse,
  CircuitBreakerConfig,
  RequestQueueConfig,
} from "@/types/analytics-service";

// ============================================================================
// HTTP Client Configuration
// ============================================================================

export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCorrelationIds: boolean;
  enableRequestLogging: boolean;
  enableDataTransformation: boolean;
  circuitBreaker: CircuitBreakerConfig;
  requestQueue: RequestQueueConfig;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  backoffFactor: number;
  maxDelay: number;
  retryableStatusCodes: number[];
  retryableErrorTypes: string[];
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

class CircuitBreaker {
  private state: "closed" | "open" | "half-open" = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = "half-open";
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is open - service unavailable");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === "half-open") {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = "closed";
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "open";
    }
  }

  getState(): "closed" | "open" | "half-open" {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// ============================================================================
// Request Queue Implementation
// ============================================================================

interface QueuedRequest {
  operation: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private activeRequests = 0;

  constructor(private config: RequestQueueConfig) {}

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        operation: operation as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
      };

      // Check if queue is full
      if (this.queue.length >= this.config.maxQueue) {
        reject(new Error("Request queue is full"));
        return;
      }

      this.queue.push(queuedRequest);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (
      this.activeRequests >= this.config.maxConcurrent ||
      this.queue.length === 0
    ) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    // Check if request has timed out
    if (Date.now() - request.timestamp > this.config.timeout) {
      request.reject(new Error("Request timed out in queue"));
      this.processQueue();
      return;
    }

    this.activeRequests++;

    try {
      const result = await request.operation();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.config.maxConcurrent,
      maxQueue: this.config.maxQueue,
    };
  }
}

// ============================================================================
// HTTP Client Class
// ============================================================================

export class AnalyticsServiceHttpClient {
  private axiosInstance: AxiosInstance;
  private config: HttpClientConfig;
  private retryConfig: RetryConfig;
  private circuitBreaker: CircuitBreaker;
  private requestQueue: RequestQueue;

  constructor(config?: Partial<HttpClientConfig>) {
    this.config = {
      baseURL: analyticsServiceConfig.baseUrl,
      timeout: analyticsServiceConfig.timeout,
      retryAttempts: analyticsServiceConfig.retryAttempts,
      retryDelay: analyticsServiceConfig.retryDelay,
      enableCorrelationIds: true,
      enableRequestLogging: analyticsServiceConfig.enableRequestLogging,
      enableDataTransformation: true,
      circuitBreaker: {
        failureThreshold: analyticsServiceConfig.circuitBreakerThreshold,
        timeout: analyticsServiceConfig.circuitBreakerTimeout,
        successThreshold: 3,
      },
      requestQueue: {
        maxConcurrent: 10,
        maxQueue: 50,
        timeout: 30000,
      },
      ...config,
    };

    this.retryConfig = {
      attempts: this.config.retryAttempts,
      delay: this.config.retryDelay,
      backoffFactor: 2,
      maxDelay: 30000,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      retryableErrorTypes: [
        "ECONNRESET",
        "ENOTFOUND",
        "ECONNABORTED",
        "ETIMEDOUT",
      ],
    };

    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker);
    this.requestQueue = new RequestQueue(this.config.requestQueue);
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  // ============================================================================
  // Axios Instance Creation
  // ============================================================================

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": `exercism-web-app/${process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}`,
      },
      // Enable automatic JSON parsing
      transformResponse: [
        (data) => {
          try {
            return typeof data === "string" ? JSON.parse(data) : data;
          } catch {
            return data;
          }
        },
      ],
    });

    return instance;
  }

  // ============================================================================
  // Request/Response Interceptors
  // ============================================================================

  private setupInterceptors(): void {
    // Request interceptor for authentication and correlation IDs
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add correlation ID for request tracing
        if (this.config.enableCorrelationIds) {
          const correlationId = createCorrelationId();
          config.headers["X-Correlation-ID"] = correlationId;
          config.metadata = { ...config.metadata, correlationId };
        }

        // Inject JWT token from auth service
        try {
          const accessToken =
            await integratedTokenManager.getValidAccessToken();
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }
        } catch (error) {
          console.warn(
            "Failed to get access token for analytics service request:",
            error,
          );
          // Continue without token - let the server handle authentication errors
        }

        // Transform request data if enabled
        if (this.config.enableDataTransformation && config.data) {
          config.data = transformApiRequest(config.data);
        }

        // Add request timestamp for performance monitoring
        config.metadata = {
          ...config.metadata,
          requestStartTime: Date.now(),
        };

        // Log request in development
        if (this.config.enableRequestLogging) {
          console.log(
            `[AnalyticsService HTTP] ${config.method?.toUpperCase()} ${config.url}`,
            {
              correlationId: config.metadata?.correlationId,
              headers: this.sanitizeHeaders(config.headers),
            },
          );
        }

        return config;
      },
      (error) => {
        console.error(
          "[AnalyticsService HTTP] Request interceptor error:",
          error,
        );
        return Promise.reject(transformErrorResponse(error));
      },
    );

    // Response interceptor for error handling and logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Transform response data if enabled
        if (this.config.enableDataTransformation && response.data) {
          response.data = transformApiResponse(response.data);
        }

        // Log successful response in development
        if (this.config.enableRequestLogging) {
          const duration =
            Date.now() - (response.config.metadata?.requestStartTime || 0);
          console.log(
            `[AnalyticsService HTTP] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
            {
              correlationId: response.config.metadata?.correlationId,
              duration: `${duration}ms`,
              dataSize: JSON.stringify(response.data).length,
            },
          );
        }

        return response;
      },
      async (error: AxiosError) => {
        // Log error response
        if (this.config.enableRequestLogging) {
          const duration =
            Date.now() - (error.config?.metadata?.requestStartTime || 0);
          console.error(
            `[AnalyticsService HTTP] ${error.response?.status || "ERROR"} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
            {
              correlationId: error.config?.metadata?.correlationId,
              duration: `${duration}ms`,
              error: error.message,
            },
          );
        }

        // Transform and handle the error
        const transformedError = transformErrorResponse(error);

        // Check if we should retry the request
        if (this.shouldRetry(error, error.config?.metadata?.retryCount || 0)) {
          return this.retryRequest(error);
        }

        return Promise.reject(transformedError);
      },
    );
  }

  // ============================================================================
  // Retry Logic with Exponential Backoff
  // ============================================================================

  private shouldRetry(error: AxiosError, retryCount: number): boolean {
    // Don't retry if we've exceeded the maximum attempts
    if (retryCount >= this.retryConfig.attempts) {
      return false;
    }

    // Don't retry if it's not an Axios error
    if (!axios.isAxiosError(error)) {
      return false;
    }

    // Check for retryable network errors
    if (!error.response && error.code) {
      return this.retryConfig.retryableErrorTypes.includes(error.code);
    }

    // Check for retryable HTTP status codes
    if (error.response) {
      return this.retryConfig.retryableStatusCodes.includes(
        error.response.status,
      );
    }

    return false;
  }

  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config!;
    const retryCount = (config.metadata?.retryCount || 0) + 1;
    const delay = this.calculateRetryDelay(retryCount);

    // Update retry metadata
    config.metadata = {
      ...config.metadata,
      retryCount,
    };

    // Log retry attempt
    if (this.config.enableRequestLogging) {
      console.log(
        `[AnalyticsService HTTP] Retrying request (attempt ${retryCount}/${this.retryConfig.attempts}) after ${delay}ms`,
        {
          correlationId: config.metadata?.correlationId,
          url: config.url,
          error: error.message,
        },
      );
    }

    // Wait for the calculated delay
    await this.delay(delay);

    // Retry the request
    return this.axiosInstance.request(config);
  }

  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.retryConfig.delay;
    const backoffDelay =
      baseDelay * Math.pow(this.retryConfig.backoffFactor, retryCount - 1);
    const jitteredDelay = backoffDelay + Math.random() * 1000; // Add jitter

    return Math.min(jitteredDelay, this.retryConfig.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private sanitizeHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized = { ...headers };

    // Remove sensitive headers from logs
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = "[REDACTED]";
      }
      if (sanitized[header.toLowerCase()]) {
        sanitized[header.toLowerCase()] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  // ============================================================================
  // Public API Methods with Circuit Breaker and Queue
  // ============================================================================

  /**
   * Performs a GET request with circuit breaker and queue
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestQueue.enqueue(async () => {
      return this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.get<ApiResponse<T>>(
          url,
          config,
        );
        return this.extractResponseData(response);
      });
    }) as Promise<T>;
  }

  /**
   * Performs a POST request with circuit breaker and queue
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.requestQueue.enqueue(async () => {
      return this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.post<ApiResponse<T>>(
          url,
          data,
          config,
        );
        return this.extractResponseData(response);
      });
    }) as Promise<T>;
  }

  /**
   * Performs a PUT request with circuit breaker and queue
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.requestQueue.enqueue(async () => {
      return this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.put<ApiResponse<T>>(
          url,
          data,
          config,
        );
        return this.extractResponseData(response);
      });
    }) as Promise<T>;
  }

  /**
   * Performs a PATCH request with circuit breaker and queue
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.requestQueue.enqueue(async () => {
      return this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.patch<ApiResponse<T>>(
          url,
          data,
          config,
        );
        return this.extractResponseData(response);
      });
    }) as Promise<T>;
  }

  /**
   * Performs a DELETE request with circuit breaker and queue
   */
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.requestQueue.enqueue(async () => {
      return this.circuitBreaker.execute(async () => {
        const response = await this.axiosInstance.delete<ApiResponse<T>>(
          url,
          config,
        );
        return this.extractResponseData(response);
      });
    }) as Promise<T>;
  }

  /**
   * Extracts data from API response wrapper
   */
  private extractResponseData<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const responseData = response.data;

    // Handle direct data responses (non-wrapped)
    if (
      !responseData ||
      typeof responseData !== "object" ||
      !("success" in responseData)
    ) {
      return responseData as T;
    }

    // Handle wrapped API responses
    if (responseData.success && responseData.data !== undefined) {
      return responseData.data;
    }

    // Handle error responses
    if (!responseData.success && responseData.error) {
      throw responseData.error;
    }

    // Fallback to raw response data
    return responseData as T;
  }

  // ============================================================================
  // Health and Monitoring Methods
  // ============================================================================

  /**
   * Gets the current configuration
   */
  getConfig(): HttpClientConfig {
    return { ...this.config };
  }

  /**
   * Gets circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Gets request queue statistics
   */
  getRequestQueueStats() {
    return this.requestQueue.getStats();
  }

  /**
   * Checks if the service is available (circuit breaker is closed)
   */
  isServiceAvailable(): boolean {
    return this.circuitBreaker.getState() !== "open";
  }

  /**
   * Updates the base URL
   */
  updateBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
    this.axiosInstance.defaults.baseURL = baseURL;
  }

  /**
   * Updates the timeout
   */
  updateTimeout(timeout: number): void {
    this.config.timeout = timeout;
    this.axiosInstance.defaults.timeout = timeout;
  }

  /**
   * Gets client statistics for monitoring
   */
  getClientStats() {
    return {
      circuitBreaker: this.circuitBreaker.getStats(),
      requestQueue: this.requestQueue.getStats(),
      isServiceAvailable: this.isServiceAvailable(),
    };
  }

  /**
   * Gets the underlying Axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const analyticsServiceHttpClient = new AnalyticsServiceHttpClient();

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new HTTP client instance with custom configuration
 */
export function createAnalyticsServiceHttpClient(
  config?: Partial<HttpClientConfig>,
): AnalyticsServiceHttpClient {
  return new AnalyticsServiceHttpClient(config);
}
