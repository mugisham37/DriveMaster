import crypto from 'crypto'

import type { FastifyRequest, FastifyReply } from 'fastify'
import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

// CSRF Token Configuration
const CSRF_TOKEN_LENGTH = 32
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_COOKIE_NAME = 'csrf-token'

// XSS Protection patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
]

// SQL Injection patterns (additional layer beyond parameterized queries)
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /('|(\\')|(;)|(\\)|(\*\/)|(--)|(\|)|(%)|(\+))/gi,
  /((%3D)|(=))[^\n]*((%27)|(')|(--)|((%3B))|(;))/gi,
  /((%27)|(')|(%6F)|o|(%4F))((%72)|r|(%52))/gi,
]

// Input validation schemas
const emailSchema = z.string().email().max(255)
const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
const uuidSchema = z.string().uuid()
const textSchema = z.string().max(10000)

export interface SecurityValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedData?: Record<string, unknown>
}

export class SecurityMiddleware {
  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  }

  /**
   * CSRF Protection middleware
   */
  static csrfProtection() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // Skip CSRF for GET, HEAD, OPTIONS requests
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return
      }

      const token = request.headers[CSRF_HEADER_NAME] as string
      const cookieToken = request.cookies?.[CSRF_COOKIE_NAME]

      if (
        token === undefined ||
        token.trim() === '' ||
        cookieToken === undefined ||
        typeof cookieToken !== 'string' ||
        cookieToken.trim() === '' ||
        token !== cookieToken
      ) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: 'Invalid or missing CSRF token',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }

      request.log.debug('CSRF token validated successfully')
    }
  }

  /**
   * XSS Protection middleware
   */
  static xssProtection() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (request.body !== null && typeof request.body === 'object') {
        const sanitizedBody = this.sanitizeObject(request.body)
        const hasXSS = this.detectXSS(JSON.stringify(request.body))

        if (hasXSS) {
          request.log.warn(
            {
              ip: request.ip,
              userAgent: request.headers['user-agent'],
              body: request.body,
            },
            'XSS attempt detected',
          )

          return reply.code(400).send({
            success: false,
            error: {
              code: 'XSS_DETECTED',
              message: 'Potentially malicious content detected',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        // Replace body with sanitized version
        request.body = sanitizedBody
      }
    }
  }

  /**
   * SQL Injection Protection middleware
   */
  static sqlInjectionProtection() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const queryString = JSON.stringify(request.query)
      const bodyString = JSON.stringify(request.body)
      const paramsString = JSON.stringify(request.params)

      const hasSQLInjection =
        this.detectSQLInjection(queryString) ||
        this.detectSQLInjection(bodyString) ||
        this.detectSQLInjection(paramsString)

      if (hasSQLInjection) {
        request.log.warn(
          {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            query: request.query,
            body: request.body,
            params: request.params,
          },
          'SQL injection attempt detected',
        )

        return reply.code(400).send({
          success: false,
          error: {
            code: 'SQL_INJECTION_DETECTED',
            message: 'Potentially malicious SQL detected',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    }
  }

  /**
   * Input validation middleware factory
   */
  static validateInput(schema: z.ZodSchema) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const validationResult = schema.safeParse(request.body)

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Input validation failed',
              details: validationResult.error.errors,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId: request.id,
            },
          })
        }

        // Replace body with validated data
        request.body = validationResult.data
      } catch (error) {
        request.log.error(error, 'Validation middleware error')

        return reply.code(500).send({
          success: false,
          error: {
            code: 'VALIDATION_MIDDLEWARE_ERROR',
            message: 'Internal validation error',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }
    }
  }

  /**
   * Security headers middleware
   */
  static securityHeaders() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // Set security headers
      void reply.header('X-Content-Type-Options', 'nosniff') // cspell:disable-line
      void reply.header('X-Frame-Options', 'DENY')
      void reply.header('X-XSS-Protection', '1; mode=block')
      void reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
      void reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

      // HSTS header for HTTPS // cspell:disable-line
      if (request.protocol === 'https') {
        void reply.header(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload',
        )
      }

      // Content Security Policy
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join('; ')

      void reply.header('Content-Security-Policy', csp)
    }
  }

  /**
   * Data encryption utilities
   */
  static encryptSensitiveData(data: string, key?: string): string {
    const encryptionKey =
      key ?? process.env.ENCRYPTION_KEY ?? crypto.randomBytes(32).toString('hex')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex').subarray(0, 32),
      iv,
    )

    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return iv.toString('hex') + ':' + encrypted
  }

  static decryptSensitiveData(encryptedData: string, key?: string): string {
    const encryptionKey = key ?? process.env.ENCRYPTION_KEY ?? ''
    const [ivHex, encrypted] = encryptedData.split(':')
    const iv = Buffer.from(ivHex, 'hex')

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex').subarray(0, 32),
      iv,
    )
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Comprehensive security validation
   */
  static validateSecurityCompliance(data: Record<string, unknown>): SecurityValidationResult {
    const errors: string[] = []
    let sanitizedData: Record<string, unknown> = data

    try {
      // XSS Detection
      if (this.detectXSS(JSON.stringify(data))) {
        errors.push('XSS patterns detected')
      }

      // SQL Injection Detection
      if (this.detectSQLInjection(JSON.stringify(data))) {
        errors.push('SQL injection patterns detected')
      }

      // Sanitize data
      sanitizedData = this.sanitizeObject(data) as Record<string, unknown>

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData,
      }
    } catch (error) {
      errors.push('Security validation failed')
      return {
        isValid: false,
        errors,
      }
    }
  }

  /**
   * Private helper methods
   */
  private static detectXSS(input: string): boolean {
    return XSS_PATTERNS.some((pattern) => pattern.test(input))
  }

  private static detectSQLInjection(input: string): boolean {
    return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input))
  }

  private static sanitizeObject(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj)
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item))
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        sanitized[key] = this.sanitizeObject(value)
      }
      return sanitized
    }

    return obj
  }
}

// Export validation schemas for reuse
export const ValidationSchemas = {
  email: emailSchema,
  password: passwordSchema,
  uuid: uuidSchema,
  text: textSchema,

  // Common composite schemas
  loginSchema: z.object({
    email: emailSchema,
    password: z.string().min(1),
  }),

  registerSchema: z
    .object({
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),

  updateProfileSchema: z.object({
    email: emailSchema.optional(),
    cognitivePatterns: z
      .object({
        processingSpeed: z.number().min(0.1).max(5.0),
        workingMemoryCapacity: z.number().min(0.1).max(5.0),
        attentionSpan: z.number().min(0.1).max(5.0),
        learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']),
      })
      .optional(),
    learningPreferences: z
      .object({
        enableNotifications: z.boolean(),
        studyReminders: z.boolean(),
        difficultyPreference: z.enum(['adaptive', 'easy', 'medium', 'hard']),
        sessionLength: z.number().min(5).max(120),
      })
      .optional(),
  }),
}
