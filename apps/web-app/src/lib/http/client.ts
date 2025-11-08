/**
 * HTTP Client for Auth Service Communication
 * Implements timeout, retry, correlation ID generation, interceptors, and performance optimizations
 */

import { config } from "../config/environment";
import { requestOptimizer } from "./request-optimizer";

export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retryAttempts?: number;
  skipAuth?: boolean;
  skipRetry?: boolean;
  skipOptimization?: boolean;
  security?: {
    requestSigning?: boolean;
    signingSecret?: string;
  };
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
  correlationId: string;
}

export interface ApiError {
  type:
    | "network"
    | "validation"
    | "authentication"
    | "authorization"
    | "server"
    | "timeout";
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
  correlationId?: string;
  recoverable: boolean;
  retryAfter?: number;
}

export type RequestInterceptor = (
  config: RequestConfig & { url: string },
) => Promise<RequestConfig & { url: string }>;
export type ResponseInterceptor = (
  response: ApiResponse,
) => Promise<ApiResponse>;
export type ErrorInterceptor = (error: ApiError) => Promise<ApiError>;

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker {
  private state: "closed" | "open" | "half-open" = "closed";
  private failureCount = 0;
  private lastFailureTime: Date | undefined;
  private nextAttemptTime: Date | undefined;

  constructor(
    private threshold: number = config.authService.circuitBreakerThreshold,
    private timeout: number = config.authService.circuitBreakerTimeout,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (
        !this.nextAttemptTime ||
        Date.now() < this.nextAttemptTime.getTime()
      ) {
        throw new Error("Circuit breaker is open - service unavailable");
      }
      this.state = "half-open";
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
    this.state = "closed";
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.threshold) {
      this.state = "open";
      this.nextAttemptTime = new Date(Date.now() + this.timeout);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}

/**
 * HTTP Client Class
 */
export class HttpClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetryAttempts: number;
  private defaultRetryDelay: number;
  private circuitBreaker: CircuitBreaker;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor() {
    this.baseUrl = config.authService.baseUrl;
    this.defaultTimeout = config.authService.timeout;
    this.defaultRetryAttempts = config.authService.retryAttempts;
    this.defaultRetryDelay = config.authService.retryDelay;
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create request signature for security
   */
  private async createRequestSignature(
    method: string,
    url: string,
    body: string,
    timestamp: string,
    correlationId: string,
  ): Promise<string> {
    if (!config.security.requestSigning || !config.security.signingSecret) {
      return "";
    }

    const message = `${method}|${url}|${body}|${timestamp}|${correlationId}`;
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
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    return baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
  }

  /**
   * Classify error type based on response
   */
  private classifyError(error: unknown, status?: number): ApiError["type"] {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      return "timeout";
    }

    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("timeout")
    ) {
      return "timeout";
    }

    if (!status) {
      return "network";
    }

    if (status === 400) return "validation";
    if (status === 401) return "authentication";
    if (status === 403) return "authorization";
    if (status >= 500) return "server";

    return "network";
  }

  /**
   * Create API error from response
   */
  private async createApiError(
    response: Response,
    correlationId: string,
    originalError?: unknown,
  ): Promise<ApiError> {
    interface ErrorData {
      message?: string;
      code?: string;
      details?: Record<string, unknown>;
    }

    let errorData: ErrorData = {};

    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        errorData = (await response.json()) as ErrorData;
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: `HTTP ${response.status} ${response.statusText}` };
    }

    const errorType = this.classifyError(originalError, response.status);

    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfter = retryAfterHeader
      ? parseInt(retryAfterHeader) * 1000
      : undefined;

    const apiError: ApiError = {
      type: errorType,
      message:
        errorData.message || `Request failed with status ${response.status}`,
      correlationId,
      recoverable: response.status >= 500 || response.status === 429,
    };

    if (errorData.code !== undefined) {
      apiError.code = errorData.code;
    }

    if (response.status !== undefined) {
      apiError.status = response.status;
    }

    if (errorData.details !== undefined) {
      apiError.details = errorData.details;
    }

    if (retryAfter !== undefined) {
      apiError.retryAfter = retryAfter;
    }

    return apiError;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<ApiResponse<T>>,
    retryAttempts: number,
    retryDelay: number,
    skipRetry: boolean = false,
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | undefined;

    for (
      let attempt = 1;
      attempt <= (skipRetry ? 1 : retryAttempts + 1);
      attempt++
    ) {
      try {
        return await this.circuitBreaker.execute(operation);
      } catch (error) {
        lastError = error as ApiError;

        // Don't retry on non-recoverable errors
        if (!lastError.recoverable || attempt > retryAttempts || skipRetry) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay =
          lastError.retryAfter || this.calculateRetryDelay(attempt, retryDelay);
        await this.sleep(delay);
      }
    }

    // Apply error interceptors
    if (lastError) {
      for (const interceptor of this.errorInterceptors) {
        lastError = await interceptor(lastError);
      }
    }

    throw lastError || new Error("Request failed");
  }

  /**
   * Make HTTP request with optimization
   */
  async request<T = unknown>(
    url: string,
    requestConfig: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    // Use request optimizer if available
    if (requestOptimizer && !requestConfig.skipOptimization) {
      return requestOptimizer.optimizeRequest<T>(url, requestConfig);
    }

    return this.executeRequest<T>(url, requestConfig);
  }

  /**
   * Execute HTTP request directly (used by optimizer)
   */
  async executeRequest<T = unknown>(
    url: string,
    requestConfig: RequestConfig = {},
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retryAttempts = this.defaultRetryAttempts,
      skipAuth = false,
      skipRetry = false,
    } = requestConfig;

    // Generate correlation ID and timestamp
    const correlationId = this.generateCorrelationId();
    const timestamp = new Date().toISOString();

    // Prepare full URL
    const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;

    // Prepare request configuration
    let config: RequestConfig & { url: string } = {
      url: fullUrl,
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
        "X-Timestamp": timestamp,
        "X-Client-Version": "1.0.0",
        ...headers,
      },
      body,
      timeout,
      retryAttempts,
      skipAuth,
      skipRetry,
    };

    // Add security configuration only if provided
    if (
      requestConfig.security?.requestSigning !== undefined ||
      requestConfig.security?.signingSecret !== undefined
    ) {
      config.security = {};
      if (requestConfig.security.requestSigning !== undefined) {
        config.security.requestSigning = requestConfig.security.requestSigning;
      }
      if (requestConfig.security.signingSecret !== undefined) {
        config.security.signingSecret = requestConfig.security.signingSecret;
      }
    }

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    // Prepare request body
    const requestBody = config.body ? JSON.stringify(config.body) : "";

    // Create request signature if enabled
    if (config.security?.requestSigning && config.method && config.headers) {
      const signature = await this.createRequestSignature(
        config.method,
        config.url,
        requestBody,
        timestamp,
        correlationId,
      );
      config.headers["X-Signature"] = signature;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const operation = async (): Promise<ApiResponse<T>> => {
      try {
        if (!config.method || !config.headers) {
          throw new Error("Invalid request configuration");
        }

        const response = await fetch(config.url, {
          method: config.method,
          headers: config.headers,
          body: requestBody || null,
          signal: controller.signal,
          credentials: "include",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const apiError = await this.createApiError(response, correlationId);
          throw apiError;
        }

        // Parse response
        let data: T;
        const contentType = response.headers.get("content-type");

        if (contentType?.includes("application/json")) {
          data = (await response.json()) as T;
        } else {
          data = (await response.text()) as T;
        }

        let apiResponse: ApiResponse<T> = {
          data,
          status: response.status,
          headers: response.headers,
          correlationId,
        };

        // Apply response interceptors
        for (const interceptor of this.responseInterceptors) {
          apiResponse = (await interceptor(apiResponse)) as ApiResponse<T>;
        }

        return apiResponse;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          throw {
            type: "timeout",
            message: "Request timeout",
            correlationId,
            recoverable: true,
          } as ApiError;
        }

        if (error && typeof error === "object" && "type" in error) {
          throw error; // Already an ApiError
        }

        const errorMessage =
          error instanceof Error ? error.message : "Network error";
        throw {
          type: "network",
          message: errorMessage,
          correlationId,
          recoverable: true,
        } as ApiError;
      }
    };

    return this.executeWithRetry(
      operation,
      retryAttempts,
      this.defaultRetryDelay,
      skipRetry,
    );
  }

  /**
   * Convenience methods
   */
  async get<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, "method">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "GET" });
  }

  async post<T = unknown>(
    url: string,
    body?: unknown,
    config?: Omit<RequestConfig, "method" | "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "POST", body });
  }

  async put<T = unknown>(
    url: string,
    body?: unknown,
    config?: Omit<RequestConfig, "method" | "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "PUT", body });
  }

  async patch<T = unknown>(
    url: string,
    body?: unknown,
    config?: Omit<RequestConfig, "method" | "body">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "PATCH", body });
  }

  async delete<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, "method">,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: "DELETE" });
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
