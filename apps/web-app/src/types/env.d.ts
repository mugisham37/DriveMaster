/**
 * Environment Variables Type Definitions
 * 
 * Extends the global NodeJS.ProcessEnv interface to include
 * all custom environment variables used in the application.
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Next.js Configuration
      NODE_ENV: 'development' | 'production' | 'test'
      NEXT_PUBLIC_SITE_URL: string
      NEXT_PUBLIC_ASSETS_HOST: string
      NEXT_PUBLIC_APP_VERSION?: string

      // Auth Service Configuration
      NEXT_PUBLIC_AUTH_SERVICE_URL: string
      AUTH_SERVICE_TIMEOUT?: string
      AUTH_SERVICE_RETRY_ATTEMPTS?: string
      AUTH_SERVICE_RETRY_DELAY?: string
      AUTH_SERVICE_CIRCUIT_BREAKER_THRESHOLD?: string
      AUTH_SERVICE_CIRCUIT_BREAKER_TIMEOUT?: string

      // User Service Configuration
      NEXT_PUBLIC_USER_SERVICE_URL: string
      NEXT_PUBLIC_USER_SERVICE_GRPC_URL?: string
      USER_SERVICE_TIMEOUT?: string
      USER_SERVICE_RETRY_ATTEMPTS?: string
      USER_SERVICE_RETRY_DELAY?: string
      USER_SERVICE_CIRCUIT_BREAKER_THRESHOLD?: string
      USER_SERVICE_CIRCUIT_BREAKER_TIMEOUT?: string
      USER_SERVICE_HEALTH_CHECK_INTERVAL?: string
      USER_SERVICE_PROTOCOL_SELECTION?: 'http' | 'grpc' | 'auto'
      USER_SERVICE_DISCOVERY_ENABLED?: string
      USER_SERVICE_DISCOVERY_REFRESH_INTERVAL?: string

      // Content Service Configuration
      NEXT_PUBLIC_CONTENT_SERVICE_URL: string
      CONTENT_SERVICE_TIMEOUT?: string
      CONTENT_SERVICE_RETRY_ATTEMPTS?: string
      CONTENT_SERVICE_RETRY_DELAY?: string
      CONTENT_SERVICE_CIRCUIT_BREAKER_THRESHOLD?: string
      CONTENT_SERVICE_CIRCUIT_BREAKER_TIMEOUT?: string
      CONTENT_SERVICE_ENABLE_REQUEST_LOGGING?: string
      CONTENT_SERVICE_ENABLE_METRICS?: string
      CONTENT_SERVICE_ENABLE_CACHING?: string
      CONTENT_SERVICE_ENABLE_WEBSOCKET?: string

      // Notification Service Configuration
      NEXT_PUBLIC_NOTIFICATION_SERVICE_URL: string
      NEXT_PUBLIC_NOTIFICATION_SERVICE_WS_URL?: string
      NOTIFICATION_SERVICE_TIMEOUT?: string
      NOTIFICATION_SERVICE_RETRY_ATTEMPTS?: string
      NOTIFICATION_SERVICE_RETRY_DELAY?: string
      NOTIFICATION_SERVICE_CIRCUIT_BREAKER_THRESHOLD?: string
      NOTIFICATION_SERVICE_CIRCUIT_BREAKER_TIMEOUT?: string
      NOTIFICATION_SERVICE_HEALTH_CHECK_INTERVAL?: string
      NOTIFICATION_SERVICE_ENABLE_WEBSOCKET?: string
      NOTIFICATION_SERVICE_ENABLE_ANALYTICS?: string
      NOTIFICATION_SERVICE_ENABLE_CACHING?: string
      NOTIFICATION_SERVICE_CACHE_TTL?: string
      NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string
      VAPID_PRIVATE_KEY?: string

      // Analytics Service Configuration
      NEXT_PUBLIC_ANALYTICS_SERVICE_URL: string
      NEXT_PUBLIC_ANALYTICS_SERVICE_WS_URL?: string
      ANALYTICS_SERVICE_TIMEOUT?: string
      ANALYTICS_SERVICE_RETRY_ATTEMPTS?: string
      ANALYTICS_SERVICE_RETRY_DELAY?: string
      ANALYTICS_SERVICE_CIRCUIT_BREAKER_THRESHOLD?: string
      ANALYTICS_SERVICE_CIRCUIT_BREAKER_TIMEOUT?: string
      ANALYTICS_SERVICE_HEALTH_CHECK_INTERVAL?: string
      ANALYTICS_SERVICE_ENABLE_REALTIME?: string
      ANALYTICS_SERVICE_ENABLE_CACHING?: string
      ANALYTICS_SERVICE_ENABLE_REQUEST_LOGGING?: string
      ANALYTICS_SERVICE_ENABLE_METRICS?: string
      ANALYTICS_SERVICE_DISCOVERY_ENABLED?: string
      ANALYTICS_SERVICE_DISCOVERY_REFRESH_INTERVAL?: string

      // OAuth Provider Configuration
      NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string
      NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED?: string
      NEXT_PUBLIC_GITHUB_CLIENT_ID?: string
      NEXT_PUBLIC_GITHUB_OAUTH_ENABLED?: string
      NEXT_PUBLIC_APPLE_CLIENT_ID?: string
      NEXT_PUBLIC_APPLE_OAUTH_ENABLED?: string
      NEXT_PUBLIC_FACEBOOK_CLIENT_ID?: string
      NEXT_PUBLIC_FACEBOOK_OAUTH_ENABLED?: string
      NEXT_PUBLIC_MICROSOFT_CLIENT_ID?: string
      NEXT_PUBLIC_MICROSOFT_OAUTH_ENABLED?: string

      // Legacy OAuth Configuration (for NextAuth.js)
      GITHUB_CLIENT_ID?: string
      GITHUB_CLIENT_SECRET?: string
      NEXTAUTH_URL?: string
      NEXTAUTH_SECRET?: string

      // Database Configuration
      DATABASE_URL?: string

      // Email Configuration
      RESEND_API_KEY?: string
      SENDGRID_API_KEY?: string
      FROM_EMAIL?: string
      SMTP_HOST?: string
      SMTP_PORT?: string
      SMTP_USER?: string
      SMTP_PASS?: string

      // Security Configuration
      CORS_ORIGINS?: string
      ALLOWED_HOSTS?: string
      CSRF_PROTECTION?: string
      REQUEST_SIGNING?: string
      REQUEST_SIGNING_SECRET?: string

      // Legacy Rails API Configuration
      RAILS_API_URL?: string
    }
  }
}

export {}