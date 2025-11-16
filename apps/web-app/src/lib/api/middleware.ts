import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth/server";

/**
 * Authentication middleware for API routes
 * Preserves exact Rails authentication behavior and error responses
 */

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: number;
    handle: string;
    email: string;
    isMentor: boolean;
    isInsider: boolean;
  };
}

export function withAuth<T extends unknown[]>(
  handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requireMentor?: boolean;
    requireInsider?: boolean;
  } = {},
) {
  return async (req: NextRequest, ...args: T) => {
    try {
      const session = await getServerAuthSession();

      // Check authentication requirement
      if (options.requireAuth && !session?.user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      // Check mentor requirement
      if (options.requireMentor && (!session?.user || !session.user.isMentor)) {
        return NextResponse.json(
          { error: "Mentor access required" },
          { status: 403 },
        );
      }

      // Check insider requirement
      if (
        options.requireInsider &&
        (!session?.user || !session.user.isInsider)
      ) {
        return NextResponse.json(
          { error: "Insider access required" },
          { status: 403 },
        );
      }

      // Add user to request object
      const authenticatedReq = req as AuthenticatedRequest;
      if (session?.user) {
        authenticatedReq.user = {
          id: session.user.id,
          handle: session.user.handle,
          email: session.user.email,
          isMentor: session.user.isMentor,
          isInsider: session.user.isInsider,
        };
      }

      return handler(authenticatedReq as AuthenticatedRequest, ...args);
    } catch (error) {
      console.error("Authentication middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Rate limiting middleware for API routes
 * Preserves Rails rate limiting behavior
 */

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  options: {
    maxRequests?: number;
    windowMs?: number;
    keyGenerator?: (req: NextRequest) => string;
  } = {},
) {
  const {
    maxRequests = 100,
    windowMs = 15 * 60 * 1000, // 15 minutes
    keyGenerator = (req) =>
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "anonymous",
  } = options;

  return async (req: NextRequest, ...args: unknown[]) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [k, v] of rateLimitMap.entries()) {
        if (v.resetTime < windowStart) {
          rateLimitMap.delete(k);
        }
      }

      // Get or create rate limit entry
      let rateLimitEntry = rateLimitMap.get(key);
      if (!rateLimitEntry || rateLimitEntry.resetTime < windowStart) {
        rateLimitEntry = { count: 0, resetTime: now + windowMs };
        rateLimitMap.set(key, rateLimitEntry);
      }

      // Check rate limit
      if (rateLimitEntry.count >= maxRequests) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": Math.ceil(
                rateLimitEntry.resetTime / 1000,
              ).toString(),
            },
          },
        );
      }

      // Increment counter
      rateLimitEntry.count++;

      // Call handler
      const response = await handler(req, ...args);

      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", maxRequests.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        (maxRequests - rateLimitEntry.count).toString(),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        Math.ceil(rateLimitEntry.resetTime / 1000).toString(),
      );

      return response;
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * CORS middleware for API routes
 * Preserves Rails CORS configuration
 */

export function withCORS(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  options: {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  } = {},
) {
  const {
    origin = process.env.NEXT_PUBLIC_APP_URL || "*",
    methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders = ["Content-Type", "Authorization", "X-Requested-With"],
    credentials = true,
  } = options;

  return async (req: NextRequest, ...args: unknown[]) => {
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": Array.isArray(origin)
            ? origin.join(", ")
            : origin,
          "Access-Control-Allow-Methods": methods.join(", "),
          "Access-Control-Allow-Headers": allowedHeaders.join(", "),
          "Access-Control-Allow-Credentials": credentials.toString(),
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Call handler
    const response = await handler(req, ...args);

    // Add CORS headers to response
    response.headers.set(
      "Access-Control-Allow-Origin",
      Array.isArray(origin) ? origin.join(", ") : origin,
    );
    response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
    response.headers.set(
      "Access-Control-Allow-Headers",
      allowedHeaders.join(", "),
    );
    response.headers.set(
      "Access-Control-Allow-Credentials",
      credentials.toString(),
    );

    return response;
  };
}

/**
 * Error handling middleware for API routes
 * Preserves Rails error response format
 */

export function withErrorHandling(
  handler: (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ...args: unknown[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      console.error("API route error:", error);

      // Handle specific error types
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: "Invalid JSON in request body" },
          { status: 400 },
        );
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        return NextResponse.json(
          { error: "External service unavailable" },
          { status: 503 },
        );
      }

      // Generic error response
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

/**
 * Compose multiple middleware functions
 */

export function compose(...middlewares: Array<(handler: unknown) => unknown>) {
  return (handler: unknown) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler,
    );
  };
}
