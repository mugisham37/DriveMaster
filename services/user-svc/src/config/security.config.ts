export interface SecurityConfig {
  encryption: {
    algorithm: string
    keyLength: number
    ivLength: number
    saltRounds: number
    keyDerivationIterations: number
  }
  jwt: {
    accessTokenExpiry: string
    refreshTokenExpiry: string
    algorithm: string
    issuer: string
    audience: string
  }
  rateLimit: {
    auth: {
      max: number
      timeWindow: string
    }
    api: {
      max: number
      timeWindow: string
    }
    registration: {
      max: number
      timeWindow: string
    }
  }
  session: {
    maxAge: number
    secure: boolean
    httpOnly: boolean
    sameSite: 'strict' | 'lax' | 'none'
  }
  csrf: {
    tokenLength: number
    cookieName: string
    headerName: string
    maxAge: number
  }
  security: {
    bcryptRounds: number
    maxLoginAttempts: number
    lockoutDuration: number
    passwordMinLength: number
    passwordRequireSpecialChars: boolean
    passwordRequireNumbers: boolean
    passwordRequireUppercase: boolean
    passwordRequireLowercase: boolean
  }
  compliance: {
    dataRetentionPeriodDays: number
    deletionGracePeriodDays: number
    exportExpirationDays: number
    auditLogRetentionDays: number
    consentVersion: string
  }
  monitoring: {
    enableSecurityEventLogging: boolean
    enableAuditLogging: boolean
    enablePerformanceMonitoring: boolean
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
}

export const securityConfig: SecurityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    saltRounds: 12,
    keyDerivationIterations: 100000,
  },
  jwt: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256',
    issuer: 'drivemaster-platform',
    audience: 'drivemaster-users',
  },
  rateLimit: {
    auth: {
      max: 5, // 5 attempts
      timeWindow: '15m', // per 15 minutes
    },
    api: {
      max: 100, // 100 requests
      timeWindow: '1m', // per minute
    },
    registration: {
      max: 3, // 3 registrations
      timeWindow: '1h', // per hour
    },
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  },
  csrf: {
    tokenLength: 32,
    cookieName: 'csrf-token',
    headerName: 'x-csrf-token',
    maxAge: 60 * 60, // 1 hour
  },
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
  },
  compliance: {
    dataRetentionPeriodDays: 7 * 365, // 7 years
    deletionGracePeriodDays: 30, // 30 days
    exportExpirationDays: 7, // 7 days
    auditLogRetentionDays: 10 * 365, // 10 years
    consentVersion: '1.0',
  },
  monitoring: {
    enableSecurityEventLogging: true,
    enableAuditLogging: true,
    enablePerformanceMonitoring: true,
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
}

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  securityConfig.session.secure = false
  securityConfig.security.bcryptRounds = 8 // Faster for development
  securityConfig.monitoring.logLevel = 'debug'
}

if (process.env.NODE_ENV === 'test') {
  securityConfig.security.bcryptRounds = 4 // Fastest for tests
  securityConfig.rateLimit.auth.max = 1000 // No rate limiting in tests
  securityConfig.rateLimit.api.max = 10000
  securityConfig.rateLimit.registration.max = 1000
}

// Validation function to ensure all required environment variables are set
export function validateSecurityConfig(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Required environment variables
  const requiredEnvVars = ['JWT_SECRET', 'MASTER_ENCRYPTION_KEY']

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  }

  // Recommended environment variables
  const recommendedEnvVars = ['REDIS_URL', 'DATABASE_URL']

  for (const envVar of recommendedEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`Missing recommended environment variable: ${envVar}`)
    }
  }

  // Security checks
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.HTTPS_ENABLED || process.env.HTTPS_ENABLED !== 'true') {
      warnings.push('HTTPS should be enabled in production')
    }

    if (securityConfig.security.bcryptRounds < 10) {
      warnings.push('bcrypt rounds should be at least 10 in production')
    }

    if (!securityConfig.session.secure) {
      warnings.push('Session cookies should be secure in production')
    }
  }

  // JWT secret strength check
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long')
  }

  // Encryption key strength check
  if (process.env.MASTER_ENCRYPTION_KEY && process.env.MASTER_ENCRYPTION_KEY.length < 64) {
    warnings.push('MASTER_ENCRYPTION_KEY should be at least 64 characters long')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// Security headers configuration
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
}

// HTTPS configuration for production
export const httpsConfig = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

export default securityConfig
