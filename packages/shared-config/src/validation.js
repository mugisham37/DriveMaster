'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.LearningEventSchema =
  exports.SessionIdSchema =
  exports.ContentIdSchema =
  exports.UserIdSchema =
  exports.ValidationError =
  exports.PaginatedResponseSchema =
  exports.ErrorResponseSchema =
  exports.SuccessResponseSchema =
  exports.PaginationSchema =
  exports.TimestampSchema =
  exports.PasswordSchema =
  exports.EmailSchema =
  exports.UUIDSchema =
    void 0
exports.validateSchema = validateSchema
exports.createValidationMiddleware = createValidationMiddleware
exports.createSuccessResponse = createSuccessResponse
exports.createErrorResponse = createErrorResponse
exports.createPaginatedResponse = createPaginatedResponse
const zod_1 = require('zod')
// Common validation schemas
exports.UUIDSchema = zod_1.z.string().uuid()
exports.EmailSchema = zod_1.z.string().email()
exports.PasswordSchema = zod_1.z.string().min(8).max(128)
exports.TimestampSchema = zod_1.z.coerce.date()
// Pagination schemas
exports.PaginationSchema = zod_1.z.object({
  page: zod_1.z.coerce.number().min(1).default(1),
  limit: zod_1.z.coerce.number().min(1).max(100).default(20),
  sortBy: zod_1.z.string().optional(),
  sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
})
// Response schemas
exports.SuccessResponseSchema = zod_1.z.object({
  success: zod_1.z.literal(true),
  data: zod_1.z.any(),
  meta: zod_1.z.object({
    timestamp: zod_1.z.string(),
    requestId: zod_1.z.string().optional(),
  }),
})
exports.ErrorResponseSchema = zod_1.z.object({
  success: zod_1.z.literal(false),
  error: zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    details: zod_1.z.any().optional(),
  }),
  meta: zod_1.z.object({
    timestamp: zod_1.z.string(),
    requestId: zod_1.z.string().optional(),
  }),
})
exports.PaginatedResponseSchema = zod_1.z.object({
  success: zod_1.z.literal(true),
  data: zod_1.z.array(zod_1.z.any()),
  pagination: zod_1.z.object({
    page: zod_1.z.number(),
    limit: zod_1.z.number(),
    total: zod_1.z.number(),
    totalPages: zod_1.z.number(),
    hasNext: zod_1.z.boolean(),
    hasPrev: zod_1.z.boolean(),
  }),
  meta: zod_1.z.object({
    timestamp: zod_1.z.string(),
    requestId: zod_1.z.string().optional(),
  }),
})
// Validation utilities
class ValidationError extends Error {
  issues
  constructor(message, issues) {
    super(message)
    this.issues = issues
    this.name = 'ValidationError'
  }
}
exports.ValidationError = ValidationError
function validateSchema(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.issues)
  }
  return result.data
}
function createValidationMiddleware(schema) {
  return (data) => {
    return validateSchema(schema, data)
  }
}
// Response builders
function createSuccessResponse(data, requestId) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}
function createErrorResponse(code, message, details, requestId) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}
function createPaginatedResponse(data, pagination, requestId) {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  return {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  }
}
// Common business validation schemas
exports.UserIdSchema = exports.UUIDSchema
exports.ContentIdSchema = exports.UUIDSchema
exports.SessionIdSchema = exports.UUIDSchema
exports.LearningEventSchema = zod_1.z.object({
  userId: exports.UserIdSchema,
  contentId: exports.ContentIdSchema,
  sessionId: exports.SessionIdSchema,
  eventType: zod_1.z.enum([
    'question_answered',
    'session_started',
    'session_ended',
    'content_viewed',
  ]),
  responseData: zod_1.z.record(zod_1.z.any()).optional(),
  contextData: zod_1.z.record(zod_1.z.any()).optional(),
  timestamp: exports.TimestampSchema.default(() => new Date()),
})
//# sourceMappingURL=validation.js.map
