/**
 * ExercismAPIClient - Centralized API communication class
 * Preserves exact Rails API request patterns and error handling
 */

export interface APIError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

export class ExercismAPIError extends Error {
  public status: number;
  public code?: string | undefined;
  public details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    status: number,
    code?: string | undefined,
    details?: Record<string, unknown> | undefined,
  ) {
    super(message);
    this.name = "ExercismAPIError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown> | FormData | string | undefined;
  timeout?: number;
  retries?: number;
  cache?: RequestCache;
}

export class ExercismAPIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(
    options: {
      baseURL?: string;
      timeout?: number;
      defaultHeaders?: Record<string, string>;
    } = {},
  ) {
    this.baseURL = options.baseURL ?? "/api";
    this.timeout = options.timeout ?? 30000;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.defaultHeaders,
    };
  }

  /**
   * Make HTTP request with Rails-compatible error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      timeout = this.timeout,
      retries = 3,
      cache = "default",
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // Prepare request body
    let requestBody: string | FormData | null = null;
    if (body) {
      if (body instanceof FormData) {
        requestBody = body;
        // Remove Content-Type header for FormData (browser will set it with boundary)
        delete requestHeaders["Content-Type"];
      } else {
        requestBody = JSON.stringify(body);
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal: controller.signal,
          cache,
          credentials: "include",
        });

        clearTimeout(timeoutId);

        // Handle non-2xx responses
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          throw new ExercismAPIError(
            errorData.message || `HTTP ${response.status}`,
            response.status,
            errorData.code,
            errorData.details,
          );
        }

        // Parse successful response
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          return await response.json();
        } else {
          return (await response.text()) as unknown as T;
        }
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) or abort errors
        if (
          error instanceof ExercismAPIError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          throw new ExercismAPIError("Request timeout", 408);
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000),
          );
        }
      }
    }

    // All retries failed
    throw (
      lastError || new ExercismAPIError("Request failed after retries", 500)
    );
  }

  /**
   * Parse error response with Rails-compatible format
   */
  private async parseErrorResponse(response: Response): Promise<{
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  }> {
    try {
      const errorData = await response.json();

      // Handle Rails-style error responses
      if (errorData.error) {
        return {
          message: errorData.error,
          code: errorData.code,
          details: errorData.details,
        };
      }

      // Handle validation errors
      if (errorData.errors) {
        return {
          message: "Validation failed",
          code: "validation_error",
          details: errorData.errors,
        };
      }

      return {
        message: errorData.message || "Unknown error",
        code: errorData.code,
        details: errorData,
      };
    } catch {
      // Fallback for non-JSON error responses
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
        code: "http_error",
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: Record<string, unknown> | FormData | string | undefined,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ?? undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: Record<string, unknown> | FormData | string | undefined,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ?? undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: Record<string, unknown> | FormData | string | undefined,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ?? undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    options: Omit<RequestOptions, "method"> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Specific API methods matching Rails controllers

  /**
   * Tracks API methods
   */
  async getTracks(params?: {
    criteria?: string;
    tags?: string;
    status?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.criteria) searchParams.append("criteria", params.criteria);
    if (params?.tags) searchParams.append("tags", params.tags);
    if (params?.status) searchParams.append("status", params.status);

    const query = searchParams.toString();
    return this.get(`/tracks${query ? `?${query}` : ""}`);
  }

  async getTrack(slug: string) {
    return this.get(`/tracks/${slug}`);
  }

  async getTrackExercises(
    slug: string,
    params?: {
      criteria?: string;
      status?: string;
      difficulty?: string;
    },
  ) {
    const searchParams = new URLSearchParams();
    if (params?.criteria) searchParams.append("criteria", params.criteria);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.difficulty)
      searchParams.append("difficulty", params.difficulty);

    const query = searchParams.toString();
    return this.get(`/tracks/${slug}/exercises${query ? `?${query}` : ""}`);
  }

  async getExercise(trackSlug: string, exerciseSlug: string) {
    return this.get(`/tracks/${trackSlug}/exercises/${exerciseSlug}`);
  }

  /**
   * User API methods
   */
  async getUser(id: string) {
    return this.get(`/users/${id}`);
  }

  async updateUser(id: string, data: Record<string, unknown>) {
    return this.patch(`/users/${id}`, data);
  }

  /**
   * Dashboard API methods
   */
  async getDashboard() {
    return this.get("/dashboard");
  }

  /**
   * Mentoring API methods
   */
  async getMentoringDiscussions(params?: {
    status?: string;
    trackSlug?: string;
    page?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.trackSlug) searchParams.append("track_slug", params.trackSlug);
    if (params?.page) searchParams.append("page", params.page);

    const query = searchParams.toString();
    return this.get(`/mentoring/discussions${query ? `?${query}` : ""}`);
  }

  async getMentoringRequests(params?: {
    trackSlug?: string;
    exerciseSlug?: string;
    order?: string;
    criteria?: string;
    page?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.trackSlug) searchParams.append("track_slug", params.trackSlug);
    if (params?.exerciseSlug)
      searchParams.append("exercise_slug", params.exerciseSlug);
    if (params?.order) searchParams.append("order", params.order);
    if (params?.criteria) searchParams.append("criteria", params.criteria);
    if (params?.page) searchParams.append("page", params.page);

    const query = searchParams.toString();
    return this.get(`/mentoring/requests${query ? `?${query}` : ""}`);
  }

  async getMentoringTestimonials(params?: {
    criteria?: string;
    order?: string;
    trackSlug?: string;
    page?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.criteria) searchParams.append("criteria", params.criteria);
    if (params?.order) searchParams.append("order", params.order);
    if (params?.trackSlug) searchParams.append("track_slug", params.trackSlug);
    if (params?.page) searchParams.append("page", params.page);

    const query = searchParams.toString();
    return this.get(`/mentoring/testimonials${query ? `?${query}` : ""}`);
  }

  async getMentoringRepresentations(params?: {
    onlyMentoredSolutions?: boolean;
    criteria?: string;
    trackSlug?: string;
    order?: string;
    page?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.onlyMentoredSolutions)
      searchParams.append("only_mentored_solutions", "true");
    if (params?.criteria) searchParams.append("criteria", params.criteria);
    if (params?.trackSlug) searchParams.append("track_slug", params.trackSlug);
    if (params?.order) searchParams.append("order", params.order);
    if (params?.page) searchParams.append("page", params.page);

    const query = searchParams.toString();
    return this.get(`/mentoring/representations${query ? `?${query}` : ""}`);
  }

  async getMentoringRepresentationsWithFeedback(params?: {
    criteria?: string;
    trackSlug?: string;
    order?: string;
    page?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.criteria) searchParams.append("criteria", params.criteria);
    if (params?.trackSlug) searchParams.append("track_slug", params.trackSlug);
    if (params?.order) searchParams.append("order", params.order);
    if (params?.page) searchParams.append("page", params.page);

    const query = searchParams.toString();
    return this.get(
      `/mentoring/representations/with-feedback${query ? `?${query}` : ""}`,
    );
  }

  async getMentoringRepresentationsAdmin(params?: {
    onlyMentoredSolutions?: boolean;
    criteria?: string;
    trackSlug?: string;
    order?: string;
    page?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.onlyMentoredSolutions)
      searchParams.append("only_mentored_solutions", "true");
    if (params?.criteria) searchParams.append("criteria", params.criteria);
    if (params?.trackSlug) searchParams.append("track_slug", params.trackSlug);
    if (params?.order) searchParams.append("order", params.order);
    if (params?.page) searchParams.append("page", params.page);

    const query = searchParams.toString();
    return this.get(
      `/mentoring/representations/admin${query ? `?${query}` : ""}`,
    );
  }

  async getMentoringTracks(params?: { status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);

    const query = searchParams.toString();
    return this.get(`/mentoring/tracks${query ? `?${query}` : ""}`);
  }

  async createMentoringDiscussion(data: {
    exerciseSlug: string;
    trackSlug: string;
    iterationUuid: string;
  }) {
    return this.post("/mentoring/discussions", data);
  }

  /**
   * Authentication API methods
   */
  async login(email: string, password: string) {
    return this.post("/auth/login", { email, password });
  }

  async signup(data: {
    email: string;
    password: string;
    handle: string;
    name?: string;
  }) {
    return this.post("/auth/signup", data);
  }

  async forgotPassword(email: string) {
    return this.post("/auth/forgot-password", { email });
  }

  async resetPassword(token: string, password: string) {
    return this.post("/auth/reset-password", { token, password });
  }
}

// Default client instance
export const apiClient = new ExercismAPIClient();

// Export for use in other modules
export default apiClient;
