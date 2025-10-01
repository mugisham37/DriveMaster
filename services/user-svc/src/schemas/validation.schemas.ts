import { z } from 'zod'

// Base validation schemas
export const BaseSchemas = {
  // Identity and authentication
  email: z.string().email('Invalid email format').max(255, 'Email too long'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),

  uuid: z.string().uuid('Invalid UUID format'),

  // Text content with XSS protection
  safeText: z
    .string()
    .max(10000, 'Text too long')
    .refine(
      (val) => !/<script|javascript:|on\w+=/i.test(val),
      'Potentially unsafe content detected',
    ),

  // Numeric constraints
  positiveNumber: z.number().positive('Must be positive'),
  percentage: z.number().min(0).max(100, 'Must be between 0 and 100'),

  // Date and time
  isoDate: z.string().datetime('Invalid ISO date format'),

  // Common enums
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  contentCategory: z.enum([
    'traffic_signs',
    'road_rules',
    'safety_procedures',
    'situational_judgment',
    'vehicle_operations',
  ]),
}

// Authentication schemas
export const AuthSchemas = {
  login: z.object({
    email: BaseSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
    deviceFingerprint: z.string().optional(),
  }),

  register: z
    .object({
      email: BaseSchemas.email,
      password: BaseSchemas.password,
      confirmPassword: z.string(),
      acceptTerms: z.boolean().refine((val) => val === true, 'Must accept terms'),
      marketingConsent: z.boolean().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),

  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),

  changePassword: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: BaseSchemas.password,
      confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "New passwords don't match",
      path: ['confirmNewPassword'],
    }),

  resetPassword: z.object({
    email: BaseSchemas.email,
  }),

  confirmResetPassword: z
    .object({
      token: z.string().min(1, 'Reset token is required'),
      newPassword: BaseSchemas.password,
      confirmNewPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "Passwords don't match",
      path: ['confirmNewPassword'],
    }),
}

// User profile schemas
export const UserSchemas = {
  cognitivePatterns: z.object({
    processingSpeed: z.number().min(0.1).max(5.0, 'Processing speed out of range'),
    workingMemoryCapacity: z.number().min(0.1).max(5.0, 'Memory capacity out of range'),
    attentionSpan: z.number().min(0.1).max(5.0, 'Attention span out of range'),
    learningStyle: BaseSchemas.learningStyle,
    preferredDifficulty: BaseSchemas.difficultyLevel.optional(),
    adaptationRate: z.number().min(0.1).max(2.0).optional(),
  }),

  learningPreferences: z.object({
    enableNotifications: z.boolean(),
    studyReminders: z.boolean(),
    difficultyPreference: z.enum(['adaptive', 'easy', 'medium', 'hard']),
    sessionLength: z.number().min(5).max(120, 'Session length must be 5-120 minutes'),
    preferredStudyTimes: z.array(z.number().min(0).max(23)).optional(),
    breakFrequency: z.number().min(5).max(60).optional(),
    gamificationEnabled: z.boolean().optional(),
  }),

  updateProfile: z.object({
    email: BaseSchemas.email.optional(),
    firstName: BaseSchemas.safeText.max(50).optional(),
    lastName: BaseSchemas.safeText.max(50).optional(),
    cognitivePatterns: z.lazy(() => UserSchemas.cognitivePatterns).optional(),
    learningPreferences: z.lazy(() => UserSchemas.learningPreferences).optional(),
    timezone: z.string().max(50).optional(),
    language: z.string().length(2, 'Language code must be 2 characters').optional(),
  }),

  progressUpdate: z.object({
    conceptId: BaseSchemas.uuid,
    isCorrect: z.boolean(),
    responseTime: z.number().positive('Response time must be positive'),
    confidenceLevel: z.number().min(0).max(1, 'Confidence must be 0-1'),
    sessionId: BaseSchemas.uuid,
    timestamp: BaseSchemas.isoDate.optional(),
  }),

  bulkProgressUpdate: z.object({
    updates: z.array(z.lazy(() => UserSchemas.progressUpdate)).max(100, 'Too many updates'),
    sessionId: BaseSchemas.uuid,
  }),
}

// Social features schemas
export const SocialSchemas = {
  friendRequest: z.object({
    friendId: BaseSchemas.uuid,
    message: BaseSchemas.safeText.max(500).optional(),
  }),

  friendResponse: z.object({
    requestId: BaseSchemas.uuid,
    accept: z.boolean(),
  }),

  shareProgress: z.object({
    achievementId: BaseSchemas.uuid,
    message: BaseSchemas.safeText.max(280).optional(),
    visibility: z.enum(['public', 'friends', 'private']),
  }),

  leaderboardQuery: z.object({
    scope: z.enum(['global', 'friends', 'local']),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'all_time']),
    category: BaseSchemas.contentCategory.optional(),
    limit: z.number().min(1).max(100).optional(),
  }),
}

// GDPR/Compliance schemas
export const ComplianceSchemas = {
  consentUpdate: z.object({
    marketingConsent: z.boolean().optional(),
    analyticsConsent: z.boolean().optional(),
    functionalConsent: z.boolean().optional(),
    timestamp: BaseSchemas.isoDate.optional(),
  }),

  dataExportRequest: z.object({
    format: z.enum(['json', 'csv', 'xml']),
    includePersonalData: z.boolean(),
    includeActivityData: z.boolean(),
    includeAnalytics: z.boolean(),
  }),

  dataDeletionRequest: z.object({
    reason: z.enum([
      'no_longer_needed',
      'withdraw_consent',
      'object_to_processing',
      'unlawful_processing',
      'other',
    ]),
    confirmDeletion: z.boolean().refine((val) => val === true, 'Must confirm deletion'),
    keepAnonymizedData: z.boolean().optional(),
  }),

  auditLogQuery: z.object({
    startDate: BaseSchemas.isoDate,
    endDate: BaseSchemas.isoDate,
    action: z.string().optional(),
    resourceType: z.string().optional(),
    limit: z.number().min(1).max(1000).optional(),
  }),
}

// Security and admin schemas
export const SecuritySchemas = {
  securityEvent: z.object({
    eventType: z.enum([
      'login_attempt',
      'password_change',
      'suspicious_activity',
      'data_access',
      'permission_change',
    ]),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: BaseSchemas.safeText.max(1000),
    metadata: z.record(z.any()).optional(),
  }),

  roleAssignment: z.object({
    userId: BaseSchemas.uuid,
    roles: z.array(z.string()).min(1, 'At least one role required'),
    expiresAt: BaseSchemas.isoDate.optional(),
  }),

  permissionCheck: z.object({
    resource: z.string().min(1, 'Resource is required'),
    action: z.string().min(1, 'Action is required'),
    context: z.record(z.any()).optional(),
  }),
}

// Validation helper functions
export class ValidationHelpers {
  /**
   * Validate and sanitize user input
   */
  static validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
  ): {
    success: boolean
    data?: T
    errors?: z.ZodError
  } {
    const result = schema.safeParse(data)
    return {
      success: result.success,
      data: result.success ? result.data : undefined,
      errors: result.success ? undefined : result.error,
    }
  }

  /**
   * Create validation middleware for Fastify
   */
  static createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
    return async (request: any, reply: any) => {
      const result = this.validateInput(schema, request.body)

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: result.errors?.errors,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }

      // Replace body with validated data
      request.body = result.data
    }
  }

  /**
   * Validate query parameters
   */
  static validateQuery<T>(
    schema: z.ZodSchema<T>,
    query: unknown,
  ): {
    success: boolean
    data?: T
    errors?: z.ZodError
  } {
    return this.validateInput(schema, query)
  }

  /**
   * Validate URL parameters
   */
  static validateParams<T>(
    schema: z.ZodSchema<T>,
    params: unknown,
  ): {
    success: boolean
    data?: T
    errors?: z.ZodError
  } {
    return this.validateInput(schema, params)
  }
}

// Export all schemas as a single object for easy importing
export const ValidationSchemas = {
  Base: BaseSchemas,
  Auth: AuthSchemas,
  User: UserSchemas,
  Social: SocialSchemas,
  Compliance: ComplianceSchemas,
  Security: SecuritySchemas,
}
