import { randomUUID } from 'crypto'

import { createKafka } from '@drivemaster/kafka-client'
import { createRedisClient } from '@drivemaster/redis-client'
import { loadEnv } from '@drivemaster/shared-config'
import { initTelemetry } from '@drivemaster/telemetry'
import jwt from '@fastify/jwt'
import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import { z, ZodError } from 'zod'

import { BayesianKnowledgeTracing, EnhancedBKTParams, BKTUpdateContext } from './algorithms/bkt'
import {
  MultiArmedBandit,
  BanditArm,
  BanditArmStats,
  ContextualFeatures,
  BanditConfig,
} from './algorithms/mab'
import {
  SpacedRepetition,
  EnhancedSRParams,
  ReviewResult,
  ScheduleContext,
} from './algorithms/spaced'
import { createMockPrismaClientWithDisconnect } from './lib/prisma'
import { MLService } from './ml/ml-service'
import type {
  UserKnowledgeState,
  LearningEventRequest,
  RecommendationRequest,
  SpacedRepetitionRequest,
  ContentIndexRequest,
  LearningEventResponse,
  RecommendationResponse,
  SpacedRepetitionResponse,
  KnowledgeStateResponse,
  DueReviewsResponse,
  MLRecommendationResponse,
  MLInsightsResponse,
  HealthResponse,
  ErrorResponse,
  ValidationErrorResponse,
} from './types/server.types'

initTelemetry('adaptive-svc')
const env = loadEnv()
const app = Fastify({ logger: true })
const prisma = createMockPrismaClientWithDisconnect()

// Initialize Redis client if URL is provided
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any = null
const redisUrl = env.REDIS_URL
if (redisUrl != null && redisUrl.length > 0) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  redis = createRedisClient(redisUrl)
}

// Initialize Kafka client if brokers are provided
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kafka: any = null
const kafkaBrokers = env.KAFKA_BROKERS
if (kafkaBrokers != null && kafkaBrokers.length > 0) {
  kafka = createKafka({ brokers: kafkaBrokers.split(',') })
}

const mlService = new MLService()

// Validation schemas
const LearningEventSchema = z.object({
  userId: z.string(),
  conceptKey: z.string(),
  itemId: z.string().optional(),
  sessionId: z.string().optional(),
  correct: z.boolean(),
  responseMs: z.number().optional(),
  confidence: z.number().min(1).max(5).optional(),
  attempts: z.number().default(1),
  difficulty: z.number().min(0).max(1).optional(),
  itemType: z.enum(['multiple_choice', 'true_false', 'scenario']).optional(),
  contextualInfo: z.record(z.any()).optional(),
})

const RecommendationRequestSchema = z.object({
  userId: z.string(),
  conceptKey: z.string(),
  sessionId: z.string().optional(),
  sessionGoal: z.string().default('learn'),
  maxItems: z.number().default(20),
  contextualInfo: z
    .object({
      timeOfDay: z.string().optional(),
      deviceType: z.string().optional(),
      studyStreak: z.number().optional(),
      fatigueLevel: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

const SpacedRepetitionUpdateSchema = z.object({
  userId: z.string(),
  conceptKey: z.string(),
  itemId: z.string(),
  quality: z.number().min(0).max(5),
  responseTime: z.number(),
  confidence: z.number().min(1).max(5).optional(),
  difficulty: z.number().min(0).max(1).optional(),
})

// Middleware
await app.register(jwt, {
  secret: env.JWT_SECRET,
})

// Auth middleware
async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch (err) {
    await reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Utility functions
async function getUserKnowledgeState(
  userId: string,
  conceptKey: string,
): Promise<UserKnowledgeState | null> {
  return await prisma.userKnowledgeState.findUnique({
    where: {
      userId_conceptKey: {
        userId,
        conceptKey,
      },
    },
  })
}

async function updateKnowledgeState(
  userId: string,
  conceptKey: string,
  newMastery: number,
  params: EnhancedBKTParams,
  _evidence: number,
  existingState?: UserKnowledgeState | null,
): Promise<void> {
  await prisma.userKnowledgeState.upsert({
    where: {
      userId_conceptKey: {
        userId,
        conceptKey,
      },
    },
    create: {
      userId,
      conceptKey,
      pL0: params.pL0,
      pT: params.pT,
      pG: params.pG,
      pS: params.pS,
      currentMastery: newMastery,
      learningVelocity: params.learningVelocity,
      confidenceWeight: params.confidenceWeight,
      responseTimeWeight: params.responseTimeWeight,
      decayRate: params.decayRate,
      totalInteractions: 1,
      correctAnswers: newMastery > 0.5 ? 1 : 0,
      lastInteraction: new Date(),
    },
    update: {
      currentMastery: newMastery,
      pT: params.pT,
      pG: params.pG,
      pS: params.pS,
      learningVelocity: params.learningVelocity,
      confidenceWeight: params.confidenceWeight,
      responseTimeWeight: params.responseTimeWeight,
      decayRate: params.decayRate,
      totalInteractions: (existingState?.totalInteractions ?? 0) + 1,
      correctAnswers: (existingState?.correctAnswers ?? 0) + (newMastery > 0.5 ? 1 : 0),
      lastInteraction: new Date(),
    },
  })
}

async function getBanditStats(
  userId: string,
  conceptKey: string,
  itemId: string,
): Promise<BanditArmStats> {
  const stats = await prisma.banditArmStats.findUnique({
    where: {
      userId_conceptKey_itemId: {
        userId,
        conceptKey,
        itemId,
      },
    },
  })

  return stats
    ? {
        alphaSuccess: stats.alphaSuccess,
        betaFailure: stats.betaFailure,
        totalPulls: stats.totalPulls,
        totalRewards: stats.totalRewards,
        avgReward: stats.avgReward,
        lastPulled: stats.lastPulled,
      }
    : {
        alphaSuccess: 1,
        betaFailure: 1,
        totalPulls: 0,
        totalRewards: 0,
        avgReward: 0,
        lastPulled: null,
      }
}

async function updateBanditStats(
  userId: string,
  conceptKey: string,
  itemId: string,
  reward: number,
): Promise<void> {
  const existing = await prisma.banditArmStats.findUnique({
    where: {
      userId_conceptKey_itemId: {
        userId,
        conceptKey,
        itemId,
      },
    },
  })

  if (existing) {
    const newTotalPulls = existing.totalPulls + 1
    const newTotalRewards = existing.totalRewards + reward
    const newAvgReward = newTotalRewards / newTotalPulls

    await prisma.banditArmStats.update({
      where: {
        userId_conceptKey_itemId: {
          userId,
          conceptKey,
          itemId,
        },
      },
      data: {
        alphaSuccess: existing.alphaSuccess + reward,
        betaFailure: existing.betaFailure + (1 - reward),
        totalPulls: newTotalPulls,
        totalRewards: newTotalRewards,
        avgReward: newAvgReward,
        lastPulled: new Date(),
      },
    })
  } else {
    await prisma.banditArmStats.create({
      data: {
        userId,
        conceptKey,
        itemId,
        alphaSuccess: 1 + reward,
        betaFailure: 1 + (1 - reward),
        totalPulls: 1,
        totalRewards: reward,
        avgReward: reward,
        lastPulled: new Date(),
      },
    })
  }
}

async function publishLearningEvent(event: Record<string, unknown>): Promise<void> {
  if (kafka === null) return

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const producer = kafka.producer()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await producer.connect()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await producer.send({
    topic: 'learning.events.v1',
    messages: [
      {
        key: String(event.userId),
        value: JSON.stringify(event),
      },
    ],
  })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await producer.disconnect()
}

// Initialize ML service
void mlService.initialize().catch((error: unknown) => {
  app.log.warn('ML Service initialization failed, using fallback algorithms: ' + String(error))
})

// Routes
app.get<{ Reply: HealthResponse }>(
  '/health',
  (): HealthResponse => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
    redis: redis !== null ? 'connected' : 'disconnected',
    kafka: kafka !== null ? 'connected' : 'disconnected',
    mlService: mlService.getHealthStatus(),
  }),
)

// Process learning event and update knowledge state
app.post<{
  Body: LearningEventRequest
  Reply: LearningEventResponse | ErrorResponse | ValidationErrorResponse
}>(
  '/learning-event',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const event = LearningEventSchema.parse(request.body)

      // Get current knowledge state
      const knowledgeState = await getUserKnowledgeState(event.userId, event.conceptKey)

      // Initialize or get BKT parameters
      const params: EnhancedBKTParams =
        knowledgeState !== null
          ? {
              pL0: knowledgeState.pL0,
              pT: knowledgeState.pT,
              pG: knowledgeState.pG,
              pS: knowledgeState.pS,
              decayRate: knowledgeState.decayRate,
              learningVelocity: knowledgeState.learningVelocity,
              confidenceWeight: knowledgeState.confidenceWeight,
              responseTimeWeight: knowledgeState.responseTimeWeight,
            }
          : BayesianKnowledgeTracing.estimateInitialParams(event.conceptKey)

      // Prepare update context
      const context: BKTUpdateContext = {
        correct: event.correct,
        responseTime: event.responseMs ?? undefined,
        confidence: event.confidence ?? undefined,
        attempts: event.attempts,
        itemDifficulty: event.difficulty ?? undefined,
        timeSinceLastInteraction:
          knowledgeState !== null
            ? Date.now() - knowledgeState.lastInteraction.getTime()
            : undefined,
      }

      // Update knowledge state using BKT
      const currentMastery = knowledgeState?.currentMastery ?? params.pL0
      const { newMastery, evidence } = BayesianKnowledgeTracing.updateKnowledgeState(
        params,
        context,
        currentMastery,
      )

      // Store learning event
      const learningEvent = await prisma.learningEvent.create({
        data: {
          userId: event.userId,
          conceptKey: event.conceptKey,
          itemId: event.itemId ?? null,
          sessionId: event.sessionId ?? null,
          correct: event.correct,
          responseMs: event.responseMs ?? null,
          confidence: event.confidence ?? null,
          attempts: event.attempts,
          difficulty: event.difficulty ?? null,
          itemType: event.itemType ?? null,
          contextualInfo: event.contextualInfo ?? {},
          masteryBefore: currentMastery,
          masteryAfter: newMastery,
        },
      })

      // Update knowledge state
      await updateKnowledgeState(
        event.userId,
        event.conceptKey,
        newMastery,
        params,
        evidence,
        knowledgeState,
      )

      // Update bandit statistics if item was provided
      const itemId = event.itemId
      if (itemId !== null && itemId !== undefined && itemId.length > 0) {
        const reward = event.correct ? 1 : 0
        await updateBanditStats(event.userId, event.conceptKey, itemId, reward)
      }

      // Publish event to Kafka for analytics
      await publishLearningEvent({
        ...event,
        eventId: learningEvent.id,
        masteryBefore: currentMastery,
        masteryAfter: newMastery,
        evidence,
        timestamp: new Date().toISOString(),
      })

      return await reply.send({
        eventId: learningEvent.id,
        masteryBefore: currentMastery,
        masteryAfter: newMastery,
        evidence,
        learningRate: (newMastery - currentMastery) / Math.max(evidence, 0.001),
      })
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return await reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'Learning event processing error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Get next recommended item using advanced algorithms
app.post<{
  Body: RecommendationRequest
  Reply: RecommendationResponse | ErrorResponse | ValidationErrorResponse
}>(
  '/recommendation',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const req = RecommendationRequestSchema.parse(request.body)

      // Get user's current knowledge state
      const knowledgeState = await getUserKnowledgeState(req.userId, req.conceptKey)
      const userMastery = knowledgeState?.currentMastery ?? 0.1

      // Get available items from content service (mock for now)
      const availableItems: BanditArm[] = [
        { id: 'item_1', conceptKey: req.conceptKey, difficulty: 0.3, engagement: 0.8 },
        { id: 'item_2', conceptKey: req.conceptKey, difficulty: 0.5, engagement: 0.7 },
        { id: 'item_3', conceptKey: req.conceptKey, difficulty: 0.7, engagement: 0.9 },
        { id: 'item_4', conceptKey: req.conceptKey, difficulty: 0.9, engagement: 0.6 },
      ]

      // Get bandit statistics for all items
      const banditStats = new Map<string, BanditArmStats>()
      for (const item of availableItems) {
        const stats = await getBanditStats(req.userId, req.conceptKey, item.id)
        banditStats.set(item.id, stats)
      }

      // Prepare contextual features
      const now = new Date()
      const features: ContextualFeatures = {
        userMastery,
        timeOfDay: req.contextualInfo?.timeOfDay ?? `${now.getHours()}:${now.getMinutes()}`,
        sessionGoal: req.sessionGoal ?? 'learn',
        fatigueLevel: req.contextualInfo?.fatigueLevel ?? 0.2,
        previousPerformance:
          knowledgeState !== null
            ? knowledgeState.correctAnswers / Math.max(knowledgeState.totalInteractions, 1)
            : 0.5,
        conceptDifficulty: 0.5, // Would be determined by concept metadata
        studyStreak: req.contextualInfo?.studyStreak ?? 1,
      }

      // Configure bandit
      const config: BanditConfig = {
        explorationRate: 0.1,
        zpdMinSuccess: 0.7,
        zpdMaxSuccess: 0.85,
        engagementWeight: 0.2,
        difficultyWeight: 0.3,
        freshnessWeight: 0.1,
      }

      // Select optimal item using Multi-Armed Bandit
      const selection = MultiArmedBandit.selectArm(availableItems, banditStats, features, config)

      // Log recommendation decision
      const decision = {
        decisionId: randomUUID(),
        userId: req.userId,
        conceptKey: req.conceptKey,
        itemId: selection.selectedArm.id,
        expectedReward: selection.expectedReward,
        sampledValue: selection.sampledValue,
        userMastery,
        contextualFeatures: features,
        timestamp: new Date().toISOString(),
      }

      // Publish recommendation decision
      if (kafka !== null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const producer = kafka.producer()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await producer.connect()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await producer.send({
          topic: 'recommendations.decisions.v1',
          messages: [
            {
              key: req.userId,
              value: JSON.stringify(decision),
            },
          ],
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await producer.disconnect()
      }

      return await reply.send({
        itemId: selection.selectedArm.id,
        expectedSuccessRate: selection.expectedReward,
        difficulty: selection.selectedArm.difficulty,
        engagement: selection.selectedArm.engagement ?? 0.5,
        recommendation: {
          confidence: selection.expectedReward,
          reasoning: 'Selected based on Multi-Armed Bandit with contextual features',
          userMastery,
          decisionId: decision.decisionId,
        },
      })
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return await reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'Recommendation error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Update spaced repetition schedule
app.post<{
  Body: SpacedRepetitionRequest
  Reply: SpacedRepetitionResponse | ErrorResponse | ValidationErrorResponse
}>(
  '/spaced-repetition',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const data = SpacedRepetitionUpdateSchema.parse(request.body)

      // Get current spaced repetition state
      const current = await prisma.spacedRepetition.findUnique({
        where: {
          userId_conceptKey_itemId: {
            userId: data.userId,
            conceptKey: data.conceptKey,
            itemId: data.itemId,
          },
        },
      })

      // Initialize parameters if new
      const params: EnhancedSRParams =
        current !== null
          ? {
              easeFactor: current.easeFactor,
              interval: current.interval,
              repetitions: current.repetitions,
              forgettingCurve: current.forgettingCurve,
              interference: current.interference as Record<string, number>,
              personalizedDecay: 1.0,
              reviewBurden: 0.5,
            }
          : {
              easeFactor: 2.5,
              interval: 1,
              repetitions: 0,
              forgettingCurve: 0.5,
              interference: {},
              personalizedDecay: 1.0,
              reviewBurden: 0.5,
            }

      // Prepare review result
      const result: ReviewResult = {
        quality: data.quality,
        responseTime: data.responseTime,
        confidence: data.confidence ?? undefined,
        difficulty: data.difficulty ?? undefined,
      }

      // Prepare context
      const context: ScheduleContext = {
        userId: data.userId,
        conceptKey: data.conceptKey,
        itemId: data.itemId,
        currentTime: new Date(),
      }

      // Update spaced repetition schedule
      const { newParams, nextReview, confidence } = SpacedRepetition.updateSpacedRepetition(
        params,
        result,
        context,
      )

      // Save updated schedule
      await prisma.spacedRepetition.upsert({
        where: {
          userId_conceptKey_itemId: {
            userId: data.userId,
            conceptKey: data.conceptKey,
            itemId: data.itemId,
          },
        },
        create: {
          userId: data.userId,
          conceptKey: data.conceptKey,
          itemId: data.itemId,
          easeFactor: newParams.easeFactor,
          interval: newParams.interval,
          repetitions: newParams.repetitions,
          forgettingCurve: newParams.forgettingCurve,
          interference: newParams.interference,
          nextReview,
          lastReview: new Date(),
          totalReviews: 1,
          successRate: data.quality >= 3 ? 1.0 : 0.0,
        },
        update: {
          easeFactor: newParams.easeFactor,
          interval: newParams.interval,
          repetitions: newParams.repetitions,
          forgettingCurve: newParams.forgettingCurve,
          interference: newParams.interference,
          nextReview,
          lastReview: new Date(),
          totalReviews: (current?.totalReviews ?? 0) + 1,
          successRate: data.quality >= 3 ? 1.0 : 0.0,
        },
      })

      return await reply.send({
        nextReview,
        interval: newParams.interval,
        easeFactor: newParams.easeFactor,
        repetitions: newParams.repetitions,
        confidence,
        reviewBurden: newParams.reviewBurden,
      })
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return await reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'Spaced repetition error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Get user's knowledge state
app.get<{
  Params: { userId: string; conceptKey: string }
  Reply: KnowledgeStateResponse | ErrorResponse
}>(
  '/knowledge-state/:userId/:conceptKey',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const { userId, conceptKey } = request.params

      const knowledgeState = await getUserKnowledgeState(userId, conceptKey)

      if (knowledgeState === null) {
        return await reply.code(404).send({ error: 'Knowledge state not found' })
      }

      // Get recent learning events
      const recentEvents = await prisma.learningEvent.findMany({
        where: {
          userId,
          conceptKey,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      // Calculate learning velocity
      const masteryHistory = recentEvents.map((e) => e.masteryAfter ?? 0).reverse()
      const learningRate = BayesianKnowledgeTracing.calculateLearningRate(masteryHistory)

      return await reply.send({
        userId,
        conceptKey,
        currentMastery: knowledgeState.currentMastery,
        parameters: {
          pL0: knowledgeState.pL0,
          pT: knowledgeState.pT,
          pG: knowledgeState.pG,
          pS: knowledgeState.pS,
          decayRate: knowledgeState.decayRate,
          learningVelocity: knowledgeState.learningVelocity,
        },
        statistics: {
          totalInteractions: knowledgeState.totalInteractions,
          correctAnswers: knowledgeState.correctAnswers,
          accuracyRate:
            knowledgeState.correctAnswers / Math.max(knowledgeState.totalInteractions, 1),
          lastInteraction: knowledgeState.lastInteraction,
          learningRate,
        },
        recentEvents: recentEvents.slice(0, 5).map((e) => ({
          id: e.id,
          correct: e.correct,
          responseTime: e.responseMs,
          confidence: e.confidence,
          masteryBefore: e.masteryBefore,
          masteryAfter: e.masteryAfter,
          createdAt: e.createdAt,
        })),
      })
    } catch (error) {
      app.log.error(error, 'Knowledge state retrieval error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Get due items for spaced repetition
app.get<{
  Params: { userId: string }
  Querystring: { lookaheadHours?: string }
  Reply: DueReviewsResponse | ErrorResponse
}>(
  '/due-reviews/:userId',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const { userId } = request.params
      const { lookaheadHours = '24' } = request.query

      const cutoffTime = new Date(Date.now() + parseInt(lookaheadHours, 10) * 60 * 60 * 1000)

      const dueReviews = await prisma.spacedRepetition.findMany({
        where: {
          userId,
        },
      })

      const reviews = dueReviews
        .filter((review) => review.nextReview <= cutoffTime)
        .map((review) => {
          const overdueDays = Math.max(
            0,
            (Date.now() - review.nextReview.getTime()) / (24 * 60 * 60 * 1000),
          )
          const urgency = Math.min(1, overdueDays / 7 + 0.1)

          return {
            conceptKey: review.conceptKey,
            itemId: review.itemId,
            nextReview: review.nextReview,
            urgency,
            repetitions: review.repetitions,
            interval: review.interval,
            successRate: review.successRate,
          }
        })

      // Sort by urgency
      reviews.sort((a, b) => b.urgency - a.urgency)

      return await reply.send({
        totalDue: reviews.length,
        reviews: reviews.slice(0, 50), // Limit to 50 items
      })
    } catch (error) {
      app.log.error(error, 'Due reviews error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// ML-enhanced recommendation endpoint
app.post<{
  Body: RecommendationRequest
  Reply: MLRecommendationResponse | ErrorResponse | ValidationErrorResponse
}>(
  '/ml-recommendation',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const req = RecommendationRequestSchema.parse(request.body)

      // Get user's current knowledge state
      const knowledgeState = await getUserKnowledgeState(req.userId, req.conceptKey)

      // Convert knowledge state to the format expected by ML service
      const knowledgeStateRecord: Record<string, unknown> =
        knowledgeState !== null
          ? {
              currentMastery: knowledgeState.currentMastery,
              learningVelocity: knowledgeState.learningVelocity,
              totalInteractions: knowledgeState.totalInteractions,
              correctAnswers: knowledgeState.correctAnswers,
              pL0: knowledgeState.pL0,
              pT: knowledgeState.pT,
              pG: knowledgeState.pG,
              pS: knowledgeState.pS,
              decayRate: knowledgeState.decayRate,
              lastInteraction: knowledgeState.lastInteraction,
            }
          : {}

      // Get enhanced recommendations using ML
      const recommendations = await mlService
        .getEnhancedRecommendations(
          req.userId,
          req.conceptKey,
          knowledgeStateRecord,
          req.contextualInfo ?? {},
          {
            maxItems: req.maxItems,
            ...(knowledgeState?.currentMastery !== undefined && {
              targetDifficulty: knowledgeState.currentMastery + 0.1,
            }),
          },
        )
        .catch((error: unknown) => {
          app.log.warn(
            'ML recommendations failed, falling back to algorithmic approach: ' + String(error),
          )
          return []
        })

      if (recommendations.length === 0) {
        // Fallback to existing MAB algorithm - redirect
        return reply.redirect('/recommendation')
      }

      return await reply.send({
        recommendations: recommendations.slice(0, req.maxItems ?? 10),
        source: 'ml-enhanced',
        timestamp: new Date().toISOString(),
      })
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return await reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'ML recommendation error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Get ML insights for user
app.get<{
  Params: { userId: string }
  Reply: MLInsightsResponse | ErrorResponse
}>(
  '/ml-insights/:userId',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const { userId } = request.params

      // Get user profile and knowledge states
      const [userProfile, knowledgeStates, recentActivity] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.userKnowledgeState.findMany({ where: { userId } }),
        prisma.learningEvent.findMany({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      ])

      if (userProfile === null) {
        return await reply.code(404).send({ error: 'User not found' })
      }

      // Convert knowledge states to map
      const knowledgeStateMap = knowledgeStates.reduce(
        (acc: Record<string, UserKnowledgeState>, ks: UserKnowledgeState) => {
          acc[ks.conceptKey] = ks
          return acc
        },
        {} as Record<string, UserKnowledgeState>,
      )

      // Convert user profile to ML service format
      const mlUserProfile = {
        createdAt: userProfile.createdAt,
        preferences: userProfile.preferences,
      }

      // Convert recent activity to ML service format
      const mlRecentActivity = recentActivity.map((event) => ({
        ...event,
        createdAt: event.createdAt,
        masteryAfter: event.masteryAfter,
        masteryBefore: event.masteryBefore,
      }))

      // Get ML insights
      const insights = await mlService
        .getUserMLInsights(userId, mlUserProfile, knowledgeStateMap, mlRecentActivity)
        .catch((error: unknown) => {
          app.log.warn('ML insights failed, using basic analytics: ' + String(error))
          return {
            dropoutRisk: 0.3,
            learningVelocity: 1.0,
            optimalStudyTime: '14:00',
            recommendedDifficulty: 0.5,
            strongConcepts: [],
            weakConcepts: [],
            nextMilestone: 'Continue learning',
          }
        })

      return await reply.send({
        userId,
        insights,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      app.log.error(error, 'ML insights error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Update user profile for ML
app.post<{
  Body: { userId: string }
  Reply: { success: boolean; message: string; timestamp: string } | ErrorResponse
}>(
  '/ml-profile-update',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const { userId } = request.body

      if ((userId?.length ?? 0) === 0) {
        return await reply.code(400).send({ error: 'userId is required' })
      }

      // Get user data for profile update
      const [userProfile, knowledgeStates, recentActivity] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.userKnowledgeState.findMany({ where: { userId } }),
        prisma.learningEvent.findMany({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      ])

      if (userProfile === null) {
        return await reply.code(404).send({ error: 'User not found' })
      }

      // Convert knowledge states to mastery map
      const knowledgeStateMap = knowledgeStates.reduce(
        (acc: Record<string, number>, ks: UserKnowledgeState) => {
          acc[ks.conceptKey] = ks.currentMastery
          return acc
        },
        {} as Record<string, number>,
      )

      // Convert recent activity to ML service format
      const mlRecentActivity = recentActivity.map((event) => ({
        ...event,
        createdAt: event.createdAt,
        masteryAfter: event.masteryAfter,
        masteryBefore: event.masteryBefore,
      }))

      // Update user profile in vector database
      await mlService.updateUserProfile(
        userId,
        mlRecentActivity,
        userProfile.preferences ?? {},
        knowledgeStateMap,
      )

      return await reply.send({
        success: true,
        message: 'User profile updated in ML system',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      app.log.error(error, 'ML profile update error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Index content for ML recommendations
app.post<{
  Body: ContentIndexRequest
  Reply: { success: boolean; message: string; contentId: string; timestamp: string } | ErrorResponse
}>(
  '/ml-index-content',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const content = request.body

      if (
        (content.id?.length ?? 0) === 0 ||
        (content.title?.length ?? 0) === 0 ||
        (content.conceptKey?.length ?? 0) === 0
      ) {
        return await reply.code(400).send({ error: 'Missing required content fields' })
      }

      await mlService.indexContent({
        id: content.id,
        title: content.title,
        description: content.description ?? '',
        conceptKey: content.conceptKey,
        difficulty: content.difficulty ?? 0.5,
        contentType: content.contentType ?? 'question',
        tags: content.tags ?? [],
      })

      return await reply.send({
        success: true,
        message: 'Content indexed for ML recommendations',
        contentId: content.id,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      app.log.error(error, 'ML content indexing error')
      return await reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Graceful shutdown
process.on('SIGINT', () => {
  void (async (): Promise<void> => {
    app.log.info('Shutting down gracefully...')
    await prisma.$disconnect()
    if (redis !== null) {
      // Redis client disconnect - using type assertion for compatibility
      await (redis as { disconnect: () => Promise<void> }).disconnect()
    }
    mlService.dispose()
    throw new Error('Graceful shutdown')
  })()
})

const port = typeof env.PORT === 'number' && env.PORT > 0 ? env.PORT : 3002

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`adaptive-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    throw new Error('Failed to start server')
  })
