export interface UserContext {
  userId: string
  email: string
  roles: string[]
  permissions: string[]
}

export interface ApiKeyInfo {
  keyId: string
  permissions: string[]
  rateLimit: number
}

// Extend FastifyRequest to include user context
declare module 'fastify' {
  interface FastifyRequest {
    user?: UserContext
    apiKey?: ApiKeyInfo
    rateLimitMultiplier?: number
    deviceFingerprint?: string
  }
}
