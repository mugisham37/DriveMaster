import { z } from 'zod'

// Common validation schemas
export const UUIDSchema = z.string().uuid()
export const EmailSchema = z.string().email()
export const PasswordSchema = z.string().min(8).max(128)
export const TimestampSchema = z.coerce.date()

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type PaginationParams = z.infer<typeof PaginationSchema>

// Response schemas
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string().optional(),
  }),
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string().optional(),
  }),
})

export const PaginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string().optional(),
  }),
})

// Validation utilities
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.issues)
  }
  return result.data
}

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    return validateSchema(schema, data)
  }
}

// Response builders
export function createSuccessResponse<T>(
  data: T,
  requestId?: string,
): {
  success: true
  data: T
  meta: {
    timestamp: string
    requestId?: string
  }
} {
  return {
    success: true as const,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId !== undefined && requestId !== '' ? { requestId } : {}),
    },
  }
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
): {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta: {
    timestamp: string
    requestId?: string
  }
} {
  return {
    success: false as const,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId !== undefined && requestId !== '' ? { requestId } : {}),
    },
  }
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
  },
  requestId?: string,
): {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    timestamp: string
    requestId?: string
  }
} {
  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return {
    success: true as const,
    data,
    pagination: {
      ...pagination,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId !== undefined && requestId !== '' ? { requestId } : {}),
    },
  }
}

// Common business validation schemas
export const UserIdSchema = UUIDSchema
export const ContentIdSchema = UUIDSchema
export const SessionIdSchema = UUIDSchema

export const LearningEventSchema = z.object({
  userId: UserIdSchema,
  contentId: ContentIdSchema,
  sessionId: SessionIdSchema,
  eventType: z.enum(['question_answered', 'session_started', 'session_ended', 'content_viewed']),
  responseData: z.record(z.any()).optional(),
  contextData: z.record(z.any()).optional(),
  timestamp: TimestampSchema.default(() => new Date()),
})

export type LearningEvent = z.infer<typeof LearningEventSchema>
