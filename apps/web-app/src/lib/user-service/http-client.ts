/**
 * HTTP REST Client for User Service Integration
 *
 * Implements:
 * - Axios instance with user-service base URL configuration
 * - JWT token injection using existing auth-service integration
 * - Request/response interceptors for correlation IDs and error handling
 * - Retry logic with exponential backoff for transient failures
 * - Requirements: 2.1, 2.4, 11.1, 11.2
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
  userServiceConfig,
  createCorrelationId,
} from "@/lib/config/user-service";
import type {
  UserServiceError,
  ApiResponse,
  UserServiceErrorType,
} from "@/types/user-service";

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
// HTTP Client Class
// ============================================================================

export class UserServiceHttpClient {
  private axiosInstance: AxiosInstance;
  private config: HttpClientConfig;
  private retryConfig: RetryConfig;

  constructor(config?: Partial<HttpClientConfig>) {
    this.config = {
      baseURL: userServiceConfig.httpUrl,
      timeout: userServiceConfig.timeout,
      retryAttempts: userServiceConfig.retryAttempts,
      retryDelay: userServiceConfig.retryDelay,
      enableCorrelationIds: true,
      enableRequestLogging: userServiceConfig.isDevelopment,
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
            "Failed to get access token for user service request:",
            error,
          );
          // Continue without token - let the server handle authentication errors
        }

        // Add request timestamp for performance monitoring
        config.metadata = {
          ...config.metadata,
          requestStartTime: Date.now(),
        };

        // Log request in development
        if (this.config.enableRequestLogging) {
          console.log(
            `[UserService HTTP] ${config.method?.toUpperCase()} ${config.url}`,
            {
              correlationId: config.metadata?.correlationId,
              headers: this.sanitizeHeaders(config.headers),
            },
          );
        }

        return config;
      },
      (error) => {
        console.error("[UserService HTTP] Request interceptor error:", error);
        return Promise.reject(this.transformError(error));
      },
    );

    // Response interceptor for error handling and logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful response in development
        if (this.config.enableRequestLogging) {
          const duration =
            Date.now() - (response.config.metadata?.requestStartTime || 0);
          console.log(
            `[UserService HTTP] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
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
            `[UserService HTTP] ${error.response?.status || "ERROR"} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
            {
              correlationId: error.config?.metadata?.correlationId,
              duration: `${duration}ms`,
              error: error.message,
            },
          );
        }

        // Transform and handle the error
        const transformedError = this.transformError(error);

        // Check if we should retry the request
        if (this.shouldRetry(error, error.config?.metadata?.retryCount || 0)) {
          return this.retryRequest(error);
        }

        return Promise.reject(transformedError);
      },
    );
  }

  // ============================================================================
  // Error Handling and Transformation
  // ============================================================================

  private transformError(error: unknown): UserServiceError {
    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse>;

      // Network errors (no response received)
      if (!axiosError.response) {
        const result: UserServiceError = {
          type: "network",
          message: this.getNetworkErrorMessage(axiosError),
          code: axiosError.code || "NETWORK_ERROR",
          recoverable: true,
        };

        // Only add correlationId if it exists
        const correlationId = axiosError.config?.metadata?.correlationId;
        if (correlationId) {
          result.correlationId = correlationId;
        }

        result.retryAfter = this.calculateRetryDelay(0);
        return result;
      }

      // HTTP error responses
      const response = axiosError.response;
      const responseData = response.data;

      // Extract error information from response
      if (
        responseData &&
        typeof responseData === "object" &&
        "error" in responseData
      ) {
        const result: UserServiceError = {
          type: this.classifyHttpError(response.status),
          message:
            responseData.error?.message ||
            responseData.message ||
            axiosError.message,
          code: responseData.error?.code || `HTTP_${response.status}`,
          recoverable: this.isRecoverableHttpError(response.status),
        };

        // Only add correlationId if it exists
        const correlationId = axiosError.config?.metadata?.correlationId;
        if (correlationId) {
          result.correlationId = correlationId;
        }

        if (responseData.error?.details) {
          result.details = responseData.error.details;
        }

        const retryAfter = this.getRetryAfterFromHeaders(response.headers);
        if (retryAfter !== undefined) {
          result.retryAfter = retryAfter;
        }

        return result;
      }

      // Fallback for HTTP errors without structured error response
      const result: UserServiceError = {
        type: this.classifyHttpError(response.status),
        message: this.getHttpErrorMessage(response.status, axiosError.message),
        code: `HTTP_${response.status}`,
        recoverable: this.isRecoverableHttpError(response.status),
      };

      // Only add correlationId if it exists
      const correlationId = axiosError.config?.metadata?.correlationId;
      if (correlationId) {
        result.correlationId = correlationId;
      }

      const retryAfter = this.getRetryAfterFromHeaders(response.headers);
      if (retryAfter !== undefined) {
        result.retryAfter = retryAfter;
      }

      return result;
    }

    // Handle other types of errors
    if (error instanceof Error) {
      return {
        type: "service",
        message: error.message,
        code: "UNKNOWN_ERROR",
        recoverable: false,
      };
    }

    // Fallback for unknown errors
    return {
      type: "service",
      message: "An unknown error occurred",
      code: "UNKNOWN_ERROR",
      recoverable: false,
    };
  }

  private classifyHttpError(statusCode: number): UserServiceErrorType {
    if (statusCode >= 400 && statusCode < 500) {
      if (statusCode === 401) return "authorization";
      if (statusCode === 403) return "authorization";
      if (statusCode === 408) return "timeout";
      if (statusCode === 422) return "validation";
      if (statusCode === 429) return "network";
      return "validation";
    }

    if (statusCode >= 500) {
      return "service";
    }

    return "network";
  }

  private isRecoverableHttpError(statusCode: number): boolean {
    // Client errors that are not recoverable
    const nonRecoverableClientErrors = [400, 401, 403, 404, 409, 410, 422];

    if (nonRecoverableClientErrors.includes(statusCode)) {
      return false;
    }

    // Server errors and some client errors are recoverable
    return statusCode >= 500 || [408, 429].includes(statusCode);
  }

  private getNetworkErrorMessage(error: AxiosError): string {
    if (error.code === "ECONNABORTED") {
      return "Request timeout. Please check your connection and try again.";
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return "Unable to connect to user service. Please try again later.";
    }

    if (error.code === "ECONNRESET") {
      return "Connection was reset. Please try again.";
    }

    return (
      error.message || "Network error occurred. Please check your connection."
    );
  }

  private getHttpErrorMessage(
    statusCode: number,
    fallbackMessage: string,
  ): string {
    const errorMessages: Record<number, string> = {
      400: "Invalid request. Please check your input and try again.",
      401: "Authentication required. Please sign in and try again.",
      403: "You do not have permission to perform this action.",
      404: "The requested resource was not found.",
      408: "Request timeout. Please try again.",
      409: "Conflict occurred. The resource may have been modified.",
      422: "Invalid data provided. Please check your input.",
      429: "Too many requests. Please wait a moment and try again.",
      500: "Internal server error. Please try again later.",
      502: "Service temporarily unavailable. Please try again later.",
      503: "Service temporarily unavailable. Please try again later.",
      504: "Request timeout. Please try again later.",
    };

    return (
      errorMessages[statusCode] ||
      fallbackMessage ||
      "An error occurred. Please try again."
    );
  }

  private getRetryAfterFromHeaders(
    headers: Record<string, unknown>,
  ): number | undefined {
    const retryAfter = headers["retry-after"] || headers["Retry-After"];

    if (typeof retryAfter === "string") {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? undefined : seconds;
    }

    if (typeof retryAfter === "number") {
      return retryAfter;
    }

    return undefined;
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
        `[UserService HTTP] Retrying request (attempt ${retryCount}/${this.retryConfig.attempts}) after ${delay}ms`,
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
  // Public API Methods
  // ============================================================================

  /**
   * Performs a GET request
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<ApiResponse<T>>(url, config);
    return this.extractResponseData(response);
  }

  /**
   * Performs a POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.post<ApiResponse<T>>(
      url,
      data,
      config,
    );
    return this.extractResponseData(response);
  }

  /**
   * Performs a PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.put<ApiResponse<T>>(
      url,
      data,
      config,
    );
    return this.extractResponseData(response);
  }

  /**
   * Performs a PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.patch<ApiResponse<T>>(
      url,
      data,
      config,
    );
    return this.extractResponseData(response);
  }

  /**
   * Performs a DELETE request
   */
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.axiosInstance.delete<ApiResponse<T>>(
      url,
      config,
    );
    return this.extractResponseData(response);
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

  /**
   * Gets the current configuration
   */
  getConfig(): HttpClientConfig {
    return { ...this.config };
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
   * Gets the underlying Axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const userServiceHttpClient = new UserServiceHttpClient();

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new HTTP client instance with custom configuration
 */
export function createUserServiceHttpClient(
  config?: Partial<HttpClientConfig>,
): UserServiceHttpClient {
  return new UserServiceHttpClient(config);
}
