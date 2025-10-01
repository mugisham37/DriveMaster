import { z } from 'zod'
export declare const UUIDSchema: z.ZodString
export declare const EmailSchema: z.ZodString
export declare const PasswordSchema: z.ZodString
export declare const TimestampSchema: z.ZodDate
export declare const PaginationSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>
    limit: z.ZodDefault<z.ZodNumber>
    sortBy: z.ZodOptional<z.ZodString>
    sortOrder: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>
  },
  'strip',
  z.ZodTypeAny,
  {
    limit: number
    page: number
    sortOrder: 'asc' | 'desc'
    sortBy?: string | undefined
  },
  {
    limit?: number | undefined
    page?: number | undefined
    sortBy?: string | undefined
    sortOrder?: 'asc' | 'desc' | undefined
  }
>
export type PaginationParams = z.infer<typeof PaginationSchema>
export declare const SuccessResponseSchema: z.ZodObject<
  {
    success: z.ZodLiteral<true>
    data: z.ZodAny
    meta: z.ZodObject<
      {
        timestamp: z.ZodString
        requestId: z.ZodOptional<z.ZodString>
      },
      'strip',
      z.ZodTypeAny,
      {
        timestamp: string
        requestId?: string | undefined
      },
      {
        timestamp: string
        requestId?: string | undefined
      }
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    success: true
    meta: {
      timestamp: string
      requestId?: string | undefined
    }
    data?: any
  },
  {
    success: true
    meta: {
      timestamp: string
      requestId?: string | undefined
    }
    data?: any
  }
>
export declare const ErrorResponseSchema: z.ZodObject<
  {
    success: z.ZodLiteral<false>
    error: z.ZodObject<
      {
        code: z.ZodString
        message: z.ZodString
        details: z.ZodOptional<z.ZodAny>
      },
      'strip',
      z.ZodTypeAny,
      {
        code: string
        message: string
        details?: any
      },
      {
        code: string
        message: string
        details?: any
      }
    >
    meta: z.ZodObject<
      {
        timestamp: z.ZodString
        requestId: z.ZodOptional<z.ZodString>
      },
      'strip',
      z.ZodTypeAny,
      {
        timestamp: string
        requestId?: string | undefined
      },
      {
        timestamp: string
        requestId?: string | undefined
      }
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    error: {
      code: string
      message: string
      details?: any
    }
    success: false
    meta: {
      timestamp: string
      requestId?: string | undefined
    }
  },
  {
    error: {
      code: string
      message: string
      details?: any
    }
    success: false
    meta: {
      timestamp: string
      requestId?: string | undefined
    }
  }
>
export declare const PaginatedResponseSchema: z.ZodObject<
  {
    success: z.ZodLiteral<true>
    data: z.ZodArray<z.ZodAny, 'many'>
    pagination: z.ZodObject<
      {
        page: z.ZodNumber
        limit: z.ZodNumber
        total: z.ZodNumber
        totalPages: z.ZodNumber
        hasNext: z.ZodBoolean
        hasPrev: z.ZodBoolean
      },
      'strip',
      z.ZodTypeAny,
      {
        limit: number
        page: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
      },
      {
        limit: number
        page: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
      }
    >
    meta: z.ZodObject<
      {
        timestamp: z.ZodString
        requestId: z.ZodOptional<z.ZodString>
      },
      'strip',
      z.ZodTypeAny,
      {
        timestamp: string
        requestId?: string | undefined
      },
      {
        timestamp: string
        requestId?: string | undefined
      }
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    data: any[]
    success: true
    meta: {
      timestamp: string
      requestId?: string | undefined
    }
    pagination: {
      limit: number
      page: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  },
  {
    data: any[]
    success: true
    meta: {
      timestamp: string
      requestId?: string | undefined
    }
    pagination: {
      limit: number
      page: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
>
export declare class ValidationError extends Error {
  readonly issues: z.ZodIssue[]
  constructor(message: string, issues: z.ZodIssue[])
}
export declare function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T
export declare function createValidationMiddleware<T>(schema: z.ZodSchema<T>): (data: unknown) => T
export declare function createSuccessResponse<T>(
  data: T,
  requestId?: string,
): {
  success: true
  data: T
  meta: {
    timestamp: string
    requestId: string | undefined
  }
}
export declare function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string,
): {
  success: false
  error: {
    code: string
    message: string
    details: any
  }
  meta: {
    timestamp: string
    requestId: string | undefined
  }
}
export declare function createPaginatedResponse<T>(
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
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    page: number
    limit: number
    total: number
  }
  meta: {
    timestamp: string
    requestId: string | undefined
  }
}
export declare const UserIdSchema: z.ZodString
export declare const ContentIdSchema: z.ZodString
export declare const SessionIdSchema: z.ZodString
export declare const LearningEventSchema: z.ZodObject<
  {
    userId: z.ZodString
    contentId: z.ZodString
    sessionId: z.ZodString
    eventType: z.ZodEnum<
      ['question_answered', 'session_started', 'session_ended', 'content_viewed']
    >
    responseData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>
    contextData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>
    timestamp: z.ZodDefault<z.ZodDate>
  },
  'strip',
  z.ZodTypeAny,
  {
    timestamp: Date
    userId: string
    contentId: string
    sessionId: string
    eventType: 'question_answered' | 'session_started' | 'session_ended' | 'content_viewed'
    responseData?: Record<string, any> | undefined
    contextData?: Record<string, any> | undefined
  },
  {
    userId: string
    contentId: string
    sessionId: string
    eventType: 'question_answered' | 'session_started' | 'session_ended' | 'content_viewed'
    timestamp?: Date | undefined
    responseData?: Record<string, any> | undefined
    contextData?: Record<string, any> | undefined
  }
>
export type LearningEvent = z.infer<typeof LearningEventSchema>
//# sourceMappingURL=validation.d.ts.map
