# Authentication System Files Analysis

This document provides a comprehensive list of all authentication-related files in the Next.js web application, organized from foundation to routes. Each file contributes to the authentication system that communicates with the auth backend service.

## 1. FOUNDATION LAYER - Types & Interfaces

### Core Types
- `apps/web-app/src/types/auth-service.ts` - **CRITICAL** - Core authentication types, interfaces for LoginCredentials, RegisterData, UserProfile, TokenPair, OAuth types, and all API response types
- `apps/web-app/src/types/index.ts` - Re-exports authentication types for global use
- `apps/web-app/src/types.ts` - Legacy types with some auth-related interfaces

## 2. CONFIGURATION LAYER

### Environment & Service Configuration
- `apps/web-app/src/lib/config/environment.ts` - Environment configuration for auth service URLs, OAuth providers, and service discovery
- `apps/web-app/src/lib/config/validate.ts` - Configuration validation including OAuth provider validation
- `apps/web-app/src/lib/config/service-discovery.ts` - Service discovery for auth service endpoints
- `apps/web-app/src/lib/config/initialize.ts` - Configuration initialization
- `apps/web-app/src/lib/config/index.ts` - Configuration exports

## 3. CORE LIBRARY LAYER

### Token Management System
- `apps/web-app/src/lib/auth/token-storage.ts` - **CRITICAL** - Token storage, validation, and JWT handling
- `apps/web-app/src/lib/auth/token-refresh.ts` - **CRITICAL** - Automatic token refresh logic and queue management
- `apps/web-app/src/lib/auth/cross-tab-sync.ts` - **CRITICAL** - Cross-tab authentication synchronization
- `apps/web-app/src/lib/auth/token-manager.ts` - **CRITICAL** - Integrated token management combining storage, refresh, and sync

### API Clients
- `apps/web-app/src/lib/auth/auth-service-client.ts` - **CRITICAL** - Core auth service API client for login, register, profile operations
- `apps/web-app/src/lib/auth/oauth-client.ts` - **CRITICAL** - OAuth provider integration client
- `apps/web-app/src/lib/auth/profile-session-client.ts` - **CRITICAL** - Profile and session management client
- `apps/web-app/src/lib/auth/api-client.ts` - **CRITICAL** - Unified API client that exports all auth clients
- `apps/web-app/src/lib/auth/client.ts` - Legacy client compatibility layer

### Error Handling System
- `apps/web-app/src/lib/auth/error-handler.ts` - **CRITICAL** - Comprehensive error classification and handling
- `apps/web-app/src/lib/auth/error-boundary.tsx` - **CRITICAL** - React error boundaries for auth operations
- `apps/web-app/src/lib/auth/error-display.tsx` - **CRITICAL** - Error display components and hooks
- `apps/web-app/src/lib/auth/error-integration.ts` - Error integration utilities for different error formats

### Resilience & Performance
- `apps/web-app/src/lib/auth/circuit-breaker.ts` - **CRITICAL** - Circuit breaker pattern for service resilience
- `apps/web-app/src/lib/auth/service-health.ts` - **CRITICAL** - Service health monitoring
- `apps/web-app/src/lib/auth/graceful-degradation.ts` - **CRITICAL** - Graceful degradation with caching fallbacks
- `apps/web-app/src/lib/auth/resilience-integration.ts` - **CRITICAL** - Integrated resilience system
- `apps/web-app/src/lib/auth/performance-optimization.ts` - **CRITICAL** - Performance optimizations and stable callbacks
- `apps/web-app/src/lib/auth/api-client-performance.ts` - API client performance monitoring

### Migration & Validation
- `apps/web-app/src/lib/auth/migration-validation.ts` - Migration validation for auth system updates

### Main Auth Library Export
- `apps/web-app/src/lib/auth/index.ts` - **CRITICAL** - Main auth library export file with server-side utilities

## 4. CONTEXT LAYER

### Authentication Context
- `apps/web-app/src/contexts/AuthContext.tsx` - **CRITICAL** - Main authentication context with state management, reducer, and provider
- `apps/web-app/src/contexts/UserContext.tsx` - User-specific context (may have auth dependencies)
- `apps/web-app/src/contexts/index.ts` - Context exports

## 5. HOOKS LAYER

### Core Authentication Hooks
- `apps/web-app/src/hooks/useAuthHooks.ts` - **CRITICAL** - Main authentication hooks (useAuth, useRequireAuth, useRequireMentor, useRequireInsider)
- `apps/web-app/src/hooks/useAuth.ts` - **CRITICAL** - Main auth hook export and legacy compatibility
- `apps/web-app/src/hooks/useAuthActions.ts` - **CRITICAL** - Authentication actions (login, register, logout, OAuth)
- `apps/web-app/src/hooks/useAuthGuards.ts` - **CRITICAL** - Authentication guards and route protection hooks

### Session & Security Hooks
- `apps/web-app/src/hooks/useSessionTimeout.ts` - **CRITICAL** - Session timeout management
- `apps/web-app/src/hooks/useCrossTabSync.ts` - Cross-tab synchronization hooks
- `apps/web-app/src/hooks/useDeviceTokens.ts` - Device token management for push notifications

### Utility Hooks
- `apps/web-app/src/hooks/useFormSubmission.ts` - Form submission utilities (used by auth forms)
- `apps/web-app/src/hooks/index.ts` - **CRITICAL** - Main hooks export file

## 6. UTILITIES LAYER

### Authentication Utilities
- `apps/web-app/src/utils/user-id-helpers.ts` - User ID validation and conversion utilities
- `apps/web-app/src/utils/send-request.ts` - HTTP request utilities with auth headers
- `apps/web-app/src/utils/use-storage.ts` - Storage utilities for auth tokens
- `apps/web-app/src/utils/index.ts` - Utilities export

### Cache Layer
- `apps/web-app/src/lib/cache/auth-cache.ts` - **CRITICAL** - Authentication-specific caching
- `apps/web-app/src/lib/cache/cache-strategies.ts` - Cache strategies for auth data
- `apps/web-app/src/lib/cache/cross-tab-sync.ts` - Cache synchronization across tabs
- `apps/web-app/src/lib/cache/index.ts` - Cache exports

## 7. COMPONENTS LAYER

### Core Authentication Components
- `apps/web-app/src/components/auth/SignInForm.tsx` - **CRITICAL** - Sign-in form component
- `apps/web-app/src/components/auth/SignUpForm.tsx` - **CRITICAL** - Sign-up form component
- `apps/web-app/src/components/auth/ForgotPasswordForm.tsx` - **CRITICAL** - Forgot password form
- `apps/web-app/src/components/auth/ResetPasswordForm.tsx` - **CRITICAL** - Reset password form

### OAuth Components
- `apps/web-app/src/components/auth/OAuthButton.tsx` - **CRITICAL** - OAuth provider buttons
- `apps/web-app/src/components/auth/OAuthProviderManager.tsx` - **CRITICAL** - OAuth provider management

### Route Protection Components
- `apps/web-app/src/components/auth/ProtectedRoute.tsx` - **CRITICAL** - Route protection wrapper
- `apps/web-app/src/components/auth/RouteGuard.tsx` - **CRITICAL** - Route guard component
- `apps/web-app/src/components/auth/RoleBasedAccess.tsx` - **CRITICAL** - Role-based access control

### Session Management Components
- `apps/web-app/src/components/auth/SessionManagement.tsx` - **CRITICAL** - Session management UI
- `apps/web-app/src/components/auth/SessionTimeoutWarning.tsx` - **CRITICAL** - Session timeout warnings
- `apps/web-app/src/components/auth/SessionExpiredDialog.tsx` - **CRITICAL** - Session expired dialog

### Profile & Account Components
- `apps/web-app/src/components/auth/ProfileManagement.tsx` - **CRITICAL** - Profile management interface

### Error & Status Components
- `apps/web-app/src/components/auth/AuthError.tsx` - **CRITICAL** - Authentication error display
- `apps/web-app/src/components/auth/AuthHealthStatus.tsx` - **CRITICAL** - Auth service health status
- `apps/web-app/src/components/auth/AuthSystemBoundary.tsx` - **CRITICAL** - Auth system error boundary

### Component Exports
- `apps/web-app/src/components/auth/index.ts` - **CRITICAL** - Auth components export file

### Layout Components with Auth Integration
- `apps/web-app/src/components/layout/UserMenu.tsx` - User menu with auth state
- `apps/web-app/src/components/layout/SiteHeader.tsx` - Site header with auth integration
- `apps/web-app/src/components/layout/Layout.tsx` - Main layout with auth provider

### Settings Components
- `apps/web-app/src/components/settings/EmailForm.tsx` - Email settings (auth-related)
- `apps/web-app/src/components/settings/PasswordForm.tsx` - Password change form
- `apps/web-app/src/components/settings/ProfileForm.tsx` - Profile settings form

### Profile Components
- `apps/web-app/src/components/profile/AccountSettings.tsx` - Account settings with auth
- `apps/web-app/src/components/profile/UserProfile.tsx` - User profile display
- `apps/web-app/src/components/profile/NewProfileForm.tsx` - New profile creation

## 8. MIDDLEWARE LAYER

### Route Protection Middleware
- `apps/web-app/src/middleware.ts` - **CRITICAL** - Next.js middleware for route protection, token validation, and auth redirects

## 9. APPLICATION ROUTES LAYER

### Root Layout
- `apps/web-app/src/app/layout.tsx` - **CRITICAL** - Root layout with AuthProvider wrapper

### Authentication Routes
- `apps/web-app/src/app/auth/signin/page.tsx` - **CRITICAL** - Sign-in page
- `apps/web-app/src/app/auth/signup/page.tsx` - **CRITICAL** - Sign-up page
- `apps/web-app/src/app/auth/forgot-password/page.tsx` - Forgot password page
- `apps/web-app/src/app/auth/reset-password/page.tsx` - Reset password page
- `apps/web-app/src/app/auth/confirm-email/page.tsx` - Email confirmation page
- `apps/web-app/src/app/auth/confirmation-required/page.tsx` - Confirmation required page
- `apps/web-app/src/app/auth/edit-account/page.tsx` - Account editing page
- `apps/web-app/src/app/auth/error/page.tsx` - Auth error page
- `apps/web-app/src/app/auth/oauth/page.tsx` - OAuth callback handling
- `apps/web-app/src/app/auth/unlock-account/page.tsx` - Account unlock page

### API Routes - Authentication Endpoints
- `apps/web-app/src/app/api/auth/login/route.ts` - **CRITICAL** - Login API endpoint
- `apps/web-app/src/app/api/auth/signup/route.ts` - **CRITICAL** - Signup API endpoint
- `apps/web-app/src/app/api/auth/refresh/route.ts` - **CRITICAL** - Token refresh endpoint
- `apps/web-app/src/app/api/auth/forgot-password/route.ts` - Forgot password API
- `apps/web-app/src/app/api/auth/reset-password/route.ts` - Reset password API
- `apps/web-app/src/app/api/auth/github-oauth/route.ts` - GitHub OAuth endpoint
- `apps/web-app/src/app/api/auth/delete-account/route.ts` - Account deletion API
- `apps/web-app/src/app/api/auth/update-account/route.ts` - Account update API
- `apps/web-app/src/app/api/auth/resend-confirmation/route.ts` - Resend confirmation API
- `apps/web-app/src/app/api/auth/unlock-account/route.ts` - Account unlock API
- `apps/web-app/src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js compatibility

### Protected Application Routes
- `apps/web-app/src/app/dashboard/page.tsx` - **CRITICAL** - Main dashboard (requires auth)
- `apps/web-app/src/app/profile/page.tsx` - Profile page (requires auth)
- `apps/web-app/src/app/settings/layout.tsx` - Settings layout (requires auth)
- `apps/web-app/src/app/settings/page.tsx` - Settings page (requires auth)
- `apps/web-app/src/app/settings/account/page.tsx` - Account settings (requires auth)
- `apps/web-app/src/app/settings/profile/page.tsx` - Profile settings (requires auth)
- `apps/web-app/src/app/mentoring/layout.tsx` - Mentoring layout (requires mentor role)
- `apps/web-app/src/app/mentoring/page.tsx` - Mentoring page (requires mentor role)
- `apps/web-app/src/app/insiders/page.tsx` - Insiders page (requires insider role)
- `apps/web-app/src/app/admin/page.tsx` - Admin page (requires admin role)

## 10. INTEGRATION FILES

### Service Integration
- `apps/web-app/src/lib/user-service/index.ts` - User service integration (auth-dependent)
- `apps/web-app/src/lib/notification-service/index.ts` - Notification service (auth-dependent)
- `apps/web-app/src/lib/analytics-service/index.ts` - Analytics service (auth-dependent)

### HTTP & API Integration
- `apps/web-app/src/lib/http/client.ts` - HTTP client with auth interceptors
- `apps/web-app/src/lib/http/interceptors.ts` - HTTP interceptors for auth headers
- `apps/web-app/src/lib/api/client.ts` - API client with auth integration
- `apps/web-app/src/lib/api/middleware.ts` - API middleware for auth

## CRITICAL FILES SUMMARY

The most critical files that form the foundation of the authentication system are:

1. **Types**: `types/auth-service.ts`
2. **Context**: `contexts/AuthContext.tsx`
3. **Core Hooks**: `hooks/useAuth.ts`, `hooks/useAuthHooks.ts`, `hooks/useAuthActions.ts`
4. **Token Management**: `lib/auth/token-manager.ts`, `lib/auth/token-storage.ts`, `lib/auth/token-refresh.ts`
5. **API Clients**: `lib/auth/api-client.ts`, `lib/auth/auth-service-client.ts`
6. **Error Handling**: `lib/auth/error-handler.ts`, `lib/auth/error-boundary.tsx`
7. **Resilience**: `lib/auth/circuit-breaker.ts`, `lib/auth/graceful-degradation.ts`
8. **Components**: `components/auth/SignInForm.tsx`, `components/auth/SignUpForm.tsx`, `components/auth/ProtectedRoute.tsx`
9. **Middleware**: `middleware.ts`
10. **Layout**: `app/layout.tsx`
11. **Main Export**: `lib/auth/index.ts`

## RECOMMENDED DEBUGGING ORDER

When debugging authentication issues, examine files in this order:

1. **Types & Interfaces** - Ensure type definitions match backend
2. **Configuration** - Verify environment variables and service URLs
3. **Token Management** - Check token storage, refresh, and validation
4. **API Clients** - Verify API communication with auth service
5. **Context & State** - Check authentication state management
6. **Hooks** - Verify hook logic and dependencies
7. **Components** - Check form validation and user interactions
8. **Middleware** - Verify route protection and redirects
9. **Routes** - Check page-level authentication requirements
10. **Integration** - Verify service integrations and dependencies

This comprehensive list covers all authentication-related files in the proper architectural order, from foundational types to user-facing routes.