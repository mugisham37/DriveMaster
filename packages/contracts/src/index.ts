import { z } from 'zod'

export const LearningEventSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  conceptKey: z.string(),
  itemId: z.string().optional(),
  correct: z.boolean(),
  responseMs: z.number().int().optional(),
  confidence: z.number().int().min(1).max(5).optional(),
  ts: z.number().int() // epoch ms
})
export type LearningEvent = z.infer<typeof LearningEventSchema>

export const RecommendationDecisionSchema = z.object({
  decisionId: z.string(),
  userId: z.string(),
  conceptKey: z.string(),
  itemId: z.string(),
  score: z.number(),
  ts: z.number().int()
})
export type RecommendationDecision = z.infer<typeof RecommendationDecisionSchema>

export const Topics = {
  LearningEvents: 'learning.events.v1',
  RecommendationDecisions: 'recommendations.decisions.v1'
} as const
