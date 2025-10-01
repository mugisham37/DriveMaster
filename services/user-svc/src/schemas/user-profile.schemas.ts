import { z } from 'zod'

// Cognitive Patterns Schema
export const cognitivePatternSchema = z.object({
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']).optional(),
  processingSpeed: z.number().min(0.1).max(2.0).optional(),
  attentionSpan: z.number().min(5).max(120).optional(), // 5-120 minutes
  preferredSessionLength: z.number().min(10).max(180).optional(), // 10-180 minutes
  optimalTimeOfDay: z.array(z.enum(['morning', 'afternoon', 'evening', 'night'])).optional(),
  difficultyPreference: z.enum(['gradual', 'challenging', 'mixed']).optional(),
  feedbackPreference: z.enum(['immediate', 'delayed', 'summary']).optional(),
})

// Learning Preferences Schema
export const learningPreferencesSchema = z.object({
  enableNotifications: z.boolean().optional(),
  notificationFrequency: z.enum(['low', 'medium', 'high']).optional(),
  studyReminders: z.boolean().optional(),
  socialFeatures: z.boolean().optional(),
  gamificationEnabled: z.boolean().optional(),
  preferredLanguage: z.string().min(2).max(5).optional(), // ISO language codes
  accessibilityOptions: z
    .object({
      highContrast: z.boolean().optional(),
      largeText: z.boolean().optional(),
      screenReader: z.boolean().optional(),
      reducedMotion: z.boolean().optional(),
    })
    .optional(),
})

// User Registration Schema
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val != null && val.trim() !== '' ? new Date(val) : undefined)),
  cognitivePatterns: cognitivePatternSchema.optional(),
  learningPreferences: learningPreferencesSchema.optional(),
})

// Profile Update Schema
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val != null && val.trim() !== '' ? new Date(val) : undefined)),
  cognitivePatterns: cognitivePatternSchema.optional(),
  learningPreferences: learningPreferencesSchema.optional(),
})

// Progress Update Schema
export const progressUpdateSchema = z.object({
  conceptId: z.string().uuid('Invalid concept ID'),
  isCorrect: z.boolean(),
  responseTime: z.number().min(0).max(300000), // Max 5 minutes
  confidenceLevel: z.number().min(0).max(1).optional(),
  sessionId: z.string().uuid('Invalid session ID'),
})

// Data Deletion Request Schema
export const dataDeletionRequestSchema = z.object({
  reason: z.string().min(10).max(500),
  scheduledFor: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val != null && val.trim() !== '' ? new Date(val) : undefined)),
})

// Response Schemas for OpenAPI documentation
export const userProfileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  cognitivePatterns: cognitivePatternSchema.optional(),
  learningPreferences: learningPreferencesSchema.optional(),
  totalXP: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  lastActiveAt: z.string().datetime().optional(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const userProgressResponseSchema = z.object({
  totalSessions: z.number(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  averageAccuracy: z.number(),
  totalStudyTime: z.number(),
  conceptsMastered: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  totalXP: z.number(),
  recentAchievements: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      completedAt: z.string().datetime(),
    }),
  ),
  weeklyProgress: z.array(
    z.object({
      date: z.string(),
      sessionsCompleted: z.number(),
      questionsAnswered: z.number(),
      accuracy: z.number(),
      studyTime: z.number(),
    }),
  ),
})

export const cognitiveAnalysisResponseSchema = z.object({
  learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'mixed']),
  processingSpeed: z.number(),
  attentionSpan: z.number(),
  preferredSessionLength: z.number(),
  optimalTimeOfDay: z.array(z.string()),
  difficultyPreference: z.enum(['gradual', 'challenging', 'mixed']),
  feedbackPreference: z.enum(['immediate', 'delayed', 'summary']),
  confidence: z.number().min(0).max(1),
})

// Type exports for TypeScript
export type CognitivePatternInput = z.infer<typeof cognitivePatternSchema>
export type LearningPreferencesInput = z.infer<typeof learningPreferencesSchema>
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>
export type DataDeletionRequestInput = z.infer<typeof dataDeletionRequestSchema>
