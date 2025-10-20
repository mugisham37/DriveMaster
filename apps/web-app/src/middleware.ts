import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
// Middleware for authentication and route protection

/**
 * Authentication middleware that preserves exact Rails redirect patterns
 * and access control behavior
 */

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    // Protected routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/tracks',
      '/mentoring',
      '/settings',
      '/notifications',
      '/solutions',
      '/iterations'
    ]
    
    // Mentor-only routes
    const mentorRoutes = [
      '/mentoring/queue',
      '/mentoring/inbox',
      '/mentoring/testimonials'
    ]
    
    // Admin routes (for future use)
    const adminRoutes = [
      '/admin'
    ]
    
    // Check if route requires authentication
    const requiresAuth = protectedRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    // Check if route requires mentor privileges
    const requiresMentor = mentorRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    // Check if route requires admin privileges
    const requiresAdmin = adminRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    // Handle unauthenticated users
    if (requiresAuth && !token) {
      // Store the attempted URL for post-auth redirect (Rails behavior)
      const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search)
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url)
      )
    }
    
    // Handle mentor-only routes
    if (requiresMentor && token && !token.isMentor) {
      // Redirect to dashboard with error message (Rails behavior)
      const response = NextResponse.redirect(new URL('/dashboard', req.url))
      response.cookies.set('flash_error', 'You need mentor privileges to access that page.', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 5 // 5 minutes
      })
      return response
    }
    
    // Handle admin-only routes (for future use)
    if (requiresAdmin && token && !token.isAdmin) {
      const response = NextResponse.redirect(new URL('/dashboard', req.url))
      response.cookies.set('flash_error', 'You need admin privileges to access that page.', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 5
      })
      return response
    }
    
    // Handle authenticated users trying to access auth pages
    if (token && pathname.startsWith('/auth/')) {
      // Check for return path in query params
      const callbackUrl = req.nextUrl.searchParams.get('callbackUrl')
      const redirectTo = callbackUrl || '/dashboard'
      
      return NextResponse.redirect(new URL(redirectTo, req.url))
    }
    
    // Allow the request to continue
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/about',
          '/tracks',
          '/community',
          '/cohorts',
          '/courses',
          '/contributing',
          '/blog',
          '/auth',
          '/api/auth'
        ]
        
        // Allow public routes
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }
        
        // For protected routes, require a valid token
        return !!token
      }
    }
  }
)

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|assets|icons|graphics).*)',
  ]
}