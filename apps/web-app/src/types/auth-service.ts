/**
 * TypeScript interfaces for Auth Service API integration
 * These types match the NestJS auth-service DTOs and response types
 */

// ============================================================================
// Core Authentication Types
// ============================================================================

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  countryCode: string
  timezone?: string
  language?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType?: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// ============================================================================
// User Profile Types
// ============================================================================

export interface UserProfile {
  id: number
  handle: string
  name?: string
  email: string
  avatarUrl: string
  reputation: string
  flair: Flair | null
  isMentor: boolean
  isInsider: boolean
  seniority?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  totalDonatedInDollars?: number
  createdAt: string
  updatedAt: string
  preferences: UserPreferences
  tracks: StudentTrack[]
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  emailNotifications: boolean
  mentorNotifications: boolean
  dismissedIntroducers?: string[]
  language?: string
  timezone?: string
}

export interface StudentTrack {
  id: number
  slug: string
  title: string
  iconUrl: string
  isJoined: boolean
  numCompletedExercises: number
  numExercises: number
  lastTouchedAt?: string
}

export interface Flair {
  id: number
  name: string
  iconUrl: string
}

export interface ProfileUpdateRequest {
  name?: string
  bio?: string
  location?: string
  website?: string
  githubUsername?: string
  twitterUsername?: string
  preferences?: Partial<UserPreferences>
}

// ============================================================================
// OAuth Provider Types
// ============================================================================

export type OAuthProviderType = 'google' | 'apple' | 'facebook' | 'github' | 'microsoft'

export interface OAuthProvider {
  id: OAuthProviderType
  name: string
  enabled: boolean
  iconUrl?: string
  displayName: string
}

export interface OAuthInitiationRequest {
  provider: OAuthProviderType
  redirectUrl?: string
  state?: string
}

export interface OAuthInitiationResponse {
  authorizationUrl: string
  state: string
  codeVerifier?: string // For PKCE flow
}

export interface OAuthCallbackRequest {
  provider: OAuthProviderType
  code: string
  state: string
  codeVerifier?: string // For PKCE flow
}

export interface OAuthCallbackResponse {
  tokens: TokenPair
  user: UserProfile
  isNewUser: boolean
}

export interface OAuthLinkRequest {
  provider: OAuthProviderType
  code: string
  state: string
}

export interface OAuthUnlinkRequest {
  provider: OAuthProviderType
}

export interface LinkedProvider {
  provider: OAuthProviderType
  providerUserId: string
  providerUsername?: string
  linkedAt: string
  isActive: boolean
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface Session {
  id: string
  userId: number
  deviceInfo: string
  ipAddress: string
  userAgent: string
  location?: string
  createdAt: string
  lastActiveAt: string
  expiresAt: string
  isCurrent: boolean
  isActive: boolean
}

export interface SessionListResponse {
  sessions: Session[]
  totalCount: number
}

export interface SessionInvalidationRequest {
  sessionId: string
}

// ============================================================================
// Error Response Types
// ============================================================================

export type AuthErrorType = 'network' | 'validation' | 'authentication' | 'authorization' | 'server' | 'oauth'

export interface AuthError {
  type: AuthErrorType
  message: string
  code?: string
  details?: Record<string, unknown>
  recoverable: boolean
  retryAfter?: number
  field?: string // For validation errors
}

export interface ValidationError extends AuthError {
  type: 'validation'
  field: string
  constraints: string[]
}

export interface NetworkError extends AuthError {
  type: 'network'
  statusCode?: number
  retryAfter: number
}

export interface AuthenticationError extends AuthError {
  type: 'authentication'
  code: 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'ACCOUNT_LOCKED' | 'EMAIL_NOT_VERIFIED'
}

export interface AuthorizationError extends AuthError {
  type: 'authorization'
  code: 'INSUFFICIENT_PERMISSIONS' | 'MENTOR_REQUIRED' | 'INSIDER_REQUIRED'
  requiredRole?: string
}

export interface OAuthError extends AuthError {
  type: 'oauth'
  code: 'OAUTH_DENIED' | 'OAUTH_ERROR' | 'PROVIDER_ERROR' | 'STATE_MISMATCH' | 'INVALID_CODE'
  provider?: OAuthProviderType
}

export interface ServerError extends AuthError {
  type: 'server'
  code: 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'RATE_LIMITED'
  statusCode: number
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: AuthError
  message?: string
  timestamp: string
}

export type LoginResponse = ApiResponse<{
  tokens: TokenPair
  user: UserProfile
}>

export type RegisterResponse = ApiResponse<{
  tokens: TokenPair
  user: UserProfile
  requiresEmailVerification?: boolean
}>

export type RefreshTokenResponse = ApiResponse<{
  tokens: TokenPair
}>

export type ProfileResponse = ApiResponse<UserProfile>

export type ProvidersResponse = ApiResponse<{
  providers: OAuthProvider[]
}>

export type HealthResponse = ApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  services: {
    database: 'healthy' | 'unhealthy'
    redis: 'healthy' | 'unhealthy'
    oauth: Record<OAuthProviderType, 'healthy' | 'unhealthy'>
  }
}>

// ============================================================================
// Request/Response Type Maps
// ============================================================================

export interface AuthServiceEndpoints {
  // Authentication endpoints
  'POST /auth/login': {
    request: LoginCredentials
    response: LoginResponse
  }
  'POST /auth/register': {
    request: RegisterData
    response: RegisterResponse
  }
  'POST /auth/refresh': {
    request: RefreshTokenRequest
    response: RefreshTokenResponse
  }
  'POST /auth/logout': {
    request: Record<string, never>
    response: ApiResponse<Record<string, never>>
  }

  // Profile endpoints
  'GET /auth/profile': {
    request: Record<string, never>
    response: ProfileResponse
  }
  'PATCH /auth/profile': {
    request: ProfileUpdateRequest
    response: ProfileResponse
  }

  // OAuth endpoints
  'GET /auth/oauth/:provider/initiate': {
    request: OAuthInitiationRequest
    response: ApiResponse<OAuthInitiationResponse>
  }
  'POST /auth/oauth/:provider/callback': {
    request: OAuthCallbackRequest
    response: ApiResponse<OAuthCallbackResponse>
  }
  'POST /auth/oauth/:provider/link': {
    request: OAuthLinkRequest
    response: ApiResponse<Record<string, never>>
  }
  'DELETE /auth/oauth/:provider/unlink': {
    request: OAuthUnlinkRequest
    response: ApiResponse<Record<string, never>>
  }
  'GET /auth/oauth/providers': {
    request: Record<string, never>
    response: ProvidersResponse
  }
  'GET /auth/oauth/linked': {
    request: Record<string, never>
    response: ApiResponse<{ providers: LinkedProvider[] }>
  }

  // Session endpoints
  'GET /auth/sessions': {
    request: Record<string, never>
    response: ApiResponse<SessionListResponse>
  }
  'DELETE /auth/sessions/:sessionId': {
    request: SessionInvalidationRequest
    response: ApiResponse<Record<string, never>>
  }

  // Health and status endpoints
  'GET /auth/health': {
    request: Record<string, never>
    response: HealthResponse
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type ExtractRequest<T extends keyof AuthServiceEndpoints> = AuthServiceEndpoints[T]['request']
export type ExtractResponse<T extends keyof AuthServiceEndpoints> = AuthServiceEndpoints[T]['response']

// Type guards for error classification
export const isValidationError = (error: AuthError): error is ValidationError => error.type === 'validation'
export const isNetworkError = (error: AuthError): error is NetworkError => error.type === 'network'
export const isAuthenticationError = (error: AuthError): error is AuthenticationError => error.type === 'authentication'
export const isAuthorizationError = (error: AuthError): error is AuthorizationError => error.type === 'authorization'
export const isOAuthError = (error: AuthError): error is OAuthError => error.type === 'oauth'
export const isServerError = (error: AuthError): error is ServerError => error.type === 'server'

// ============================================================================
// Configuration Types
// ============================================================================

export interface AuthServiceConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
  enableCors: boolean
  corsOrigins: string[]
  oauth: {
    [K in OAuthProviderType]: {
      clientId: string
      enabled: boolean
      scopes: string[]
    }
  }
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime?: Date
  nextAttemptTime?: Date
}

// ============================================================================
// Event Types for Cross-Tab Synchronization
// ============================================================================

export interface AuthSyncMessage {
  type: 'login' | 'logout' | 'token_refresh' | 'profile_update' | 'session_timeout'
  payload: unknown
  timestamp: number
  tabId: string
}

export interface LoginSyncPayload {
  user: UserProfile
  tokens: TokenPair
}

export interface LogoutSyncPayload {
  reason: 'user_initiated' | 'session_expired' | 'token_invalid'
}

export interface TokenRefreshSyncPayload {
  tokens: TokenPair
}

export interface ProfileUpdateSyncPayload {
  user: UserProfile
}