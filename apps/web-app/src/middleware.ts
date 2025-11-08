import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Custom Authentication Middleware for Auth Service Integration
 *
 * Implements:
 * - JWT token validation using auth service tokens
 * - Route protection with automatic redirect logic
 * - Return URL preservation for post-login redirect
 * - Role-based access control (mentor, insider)
 * - Requirements: 3.1, 3.3, 3.4
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

interface TokenPayload {
  sub?: string;
  email?: string;
  handle?: string;
  isMentor?: boolean;
  isInsider?: boolean;
  isAdmin?: boolean;
  exp?: number;
  iat?: number;
}

interface ValidationResult {
  isValid: boolean;
  payload?: TokenPayload;
  error?: string;
}

// ============================================================================
// Token Management Utilities
// ============================================================================

/**
 * Validates JWT token using the auth service secret
 */
async function validateToken(token: string): Promise<ValidationResult> {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ||
        process.env.AUTH_SERVICE_JWT_SECRET ||
        "fallback-secret",
    );

    const { payload } = await jwtVerify(token, secret);

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { isValid: false, error: "Token expired" };
    }

    return {
      isValid: true,
      payload: payload as unknown as TokenPayload,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Token validation failed",
    };
  }
}

/**
 * Extracts authentication token from request headers or cookies
 */
function extractTokenFromRequest(req: NextRequest): string | null {
  // Priority 1: Authorization header (Bearer token)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Priority 2: Access token cookie
  const tokenCookie = req.cookies.get("access_token");
  if (tokenCookie?.value) {
    return tokenCookie.value;
  }

  // Priority 3: Auth token cookie (alternative name)
  const authTokenCookie = req.cookies.get("auth_token");
  if (authTokenCookie?.value) {
    return authTokenCookie.value;
  }

  return null;
}

/**
 * Creates redirect response with return URL preservation
 */
function createAuthRedirect(
  req: NextRequest,
  redirectTo: string = "/auth/signin",
): NextResponse {
  const currentUrl = req.nextUrl.pathname + req.nextUrl.search;
  const callbackUrl = encodeURIComponent(currentUrl);
  const finalUrl = `${redirectTo}?callbackUrl=${callbackUrl}`;

  return NextResponse.redirect(new URL(finalUrl, req.url));
}

/**
 * Creates error redirect with flash message
 */
function createErrorRedirect(
  req: NextRequest,
  redirectTo: string,
  errorMessage: string,
): NextResponse {
  const response = NextResponse.redirect(new URL(redirectTo, req.url));

  // Set flash error message cookie
  response.cookies.set("flash_error", errorMessage, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5, // 5 minutes
    path: "/",
  });

  return response;
}

// ============================================================================
// Route Configuration
// ============================================================================

const ROUTE_CONFIG = {
  // Public routes that don't require authentication
  public: [
    "/",
    "/about",
    "/tracks",
    "/community",
    "/cohorts",
    "/courses",
    "/contributing",
    "/blog",
    "/auth",
    "/api/auth",
    "/api/health",
    "/privacy",
    "/terms",
  ],

  // Protected routes that require authentication
  protected: [
    "/dashboard",
    "/settings",
    "/notifications",
    "/solutions",
    "/iterations",
    "/profile",
  ],

  // Mentor-only routes
  mentor: [
    "/mentoring/queue",
    "/mentoring/inbox",
    "/mentoring/testimonials",
    "/mentoring/dashboard",
  ],

  // Insider-only routes
  insider: ["/insiders", "/insider-features", "/beta"],

  // Admin routes (for future use)
  admin: ["/admin"],
};

// ============================================================================
// Main Middleware Function
// ============================================================================

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for static files and API routes that don't need auth
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  // Extract and validate token
  const token = extractTokenFromRequest(req);
  let tokenPayload: TokenPayload | null = null;

  if (token) {
    const validation = await validateToken(token);
    if (validation.isValid && validation.payload) {
      tokenPayload = validation.payload;
    }
  }

  // Determine route requirements
  const routeType = getRouteType(pathname);

  // Handle different route types
  switch (routeType) {
    case "public":
      return handlePublicRoute(req, tokenPayload);

    case "protected":
      return handleProtectedRoute(req, tokenPayload);

    case "mentor":
      return handleMentorRoute(req, tokenPayload);

    case "insider":
      return handleInsiderRoute(req, tokenPayload);

    case "admin":
      return handleAdminRoute(req, tokenPayload);

    case "auth":
      return handleAuthRoute(req, tokenPayload);

    default:
      // Default to protected for unknown routes
      return handleProtectedRoute(req, tokenPayload);
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

function shouldSkipMiddleware(pathname: string): boolean {
  const skipPatterns = [
    "/_next/",
    "/favicon.ico",
    "/assets/",
    "/icons/",
    "/graphics/",
    "/public/",
    "/api/health",
  ];

  return skipPatterns.some((pattern) => pathname.startsWith(pattern));
}

function getRouteType(pathname: string): string {
  // Check auth routes first
  if (pathname.startsWith("/auth/")) {
    return "auth";
  }

  // Check specific route types
  for (const [type, routes] of Object.entries(ROUTE_CONFIG)) {
    if (routes.some((route) => pathname.startsWith(route))) {
      return type;
    }
  }

  return "unknown";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handlePublicRoute(
  _req: NextRequest,
  _tokenPayload: TokenPayload | null,
): NextResponse {
  // Public routes are always accessible
  return NextResponse.next();
}

function handleProtectedRoute(
  req: NextRequest,
  tokenPayload: TokenPayload | null,
): NextResponse {
  if (!tokenPayload) {
    return createAuthRedirect(req);
  }

  return NextResponse.next();
}

function handleMentorRoute(
  req: NextRequest,
  tokenPayload: TokenPayload | null,
): NextResponse {
  // First check authentication
  if (!tokenPayload) {
    return createAuthRedirect(req);
  }

  // Then check mentor privileges
  if (!tokenPayload.isMentor) {
    return createErrorRedirect(
      req,
      "/dashboard",
      "You need mentor privileges to access that page.",
    );
  }

  return NextResponse.next();
}

function handleInsiderRoute(
  req: NextRequest,
  tokenPayload: TokenPayload | null,
): NextResponse {
  // First check authentication
  if (!tokenPayload) {
    return createAuthRedirect(req);
  }

  // Then check insider privileges
  if (!tokenPayload.isInsider) {
    return createErrorRedirect(
      req,
      "/insiders",
      "You need insider privileges to access that page.",
    );
  }

  return NextResponse.next();
}

function handleAdminRoute(
  req: NextRequest,
  tokenPayload: TokenPayload | null,
): NextResponse {
  // First check authentication
  if (!tokenPayload) {
    return createAuthRedirect(req);
  }

  // Then check admin privileges
  if (!tokenPayload.isAdmin) {
    return createErrorRedirect(
      req,
      "/dashboard",
      "You need admin privileges to access that page.",
    );
  }

  return NextResponse.next();
}

function handleAuthRoute(
  req: NextRequest,
  tokenPayload: TokenPayload | null,
): NextResponse {
  // If user is already authenticated, redirect to callback URL or dashboard
  if (tokenPayload) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    const redirectTo = callbackUrl || "/dashboard";

    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // Allow access to auth routes for unauthenticated users
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (Auth service API routes - handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, icons, graphics)
     * - api/health (health check endpoints)
     */
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|assets|icons|graphics|public).*)",
  ],
};
