import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createRedisClient } from '@drivemaster/redis-client'
import { createKafka } from '@drivemaster/kafka-client'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import {
  BayesianKnowledgeTracing,
  EnhancedBKTParams,
  BKTUpdateContext,
  ConceptDependency,
} from './algorithms/bkt'
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
import {
  ItemResponseTheory,
  IRTItemParams,
  IRTResponse,
  IRTEstimationResult,
} from './algorithms/irt'
import { MLService } from './ml/ml-service'

initTelemetry('adaptive-svc')
const env = loadEnv()
const app = Fastify({ logger: true })
const prisma = new PrismaClient()
const redis = env.REDIS_URL ? createRedisClient(env.REDIS_URL) : null
const kafka = env.KAFKA_BROKERS ? createKafka({ brokers: env.KAFKA_BROKERS.split(',') }) : null
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
await app.register(jwt, { secret: env.JWT_SECRET || 'change_me' })

// Auth middleware
async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Utility functions
async function getUserKnowledgeState(userId: string, conceptKey: string): Promise<any> {
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
  evidence: number,
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
      totalInteractions: { increment: 1 },
      correctAnswers: newMastery > 0.5 ? { increment: 1 } : undefined,
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
        lastPulled: stats.lastPulled || undefined,
      }
    : {
        alphaSuccess: 1,
        betaFailure: 1,
        totalPulls: 0,
        totalRewards: 0,
        avgReward: 0,
      }
}

async function updateBanditStats(
  userId: string,
  conceptKey: string,
  itemId: string,
  reward: number,
): Promise<void> {
  await prisma.banditArmStats.upsert({
    where: {
      userId_conceptKey_itemId: {
        userId,
        conceptKey,
        itemId,
      },
    },
    create: {
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
    update: {
      alphaSuccess: { increment: reward },
      betaFailure: { increment: 1 - reward },
      totalPulls: { increment: 1 },
      totalRewards: { increment: reward },
      avgReward: { increment: reward },
      lastPulled: new Date(),
    },
  })
}

async function publishLearningEvent(event: any): Promise<void> {
  if (!kafka) return

  const producer = kafka.producer()
  await producer.connect()

  await producer.send({
    topic: 'learning.events.v1',
    messages: [
      {
        key: event.userId,
        value: JSON.stringify(event),
      },
    ],
  })

  await producer.disconnect()
}

// Initialize ML service
mlService.initialize().catch((error) => {
  app.log.warn('ML Service initialization failed, using fallback algorithms:', error)
})

// Routes
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  database: 'connected',
  redis: redis ? 'connected' : 'disconnected',
  kafka: kafka ? 'connected' : 'disconnected',
  mlService: mlService.getHealthStatus(),
}))

// Process learning event and update knowledge state
app.post(
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
      const params: EnhancedBKTParams = knowledgeState
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
        responseTime: event.responseMs,
        confidence: event.confidence,
        attempts: event.attempts,
        itemDifficulty: event.difficulty,
        timeSinceLastInteraction: knowledgeState
          ? Date.now() - knowledgeState.lastInteraction.getTime()
          : undefined,
      }

      // Update knowledge state using BKT
      const currentMastery = knowledgeState?.currentMastery || params.pL0
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
          itemId: event.itemId,
          sessionId: event.sessionId,
          correct: event.correct,
          responseMs: event.responseMs,
          confidence: event.confidence,
          attempts: event.attempts,
          difficulty: event.difficulty,
          itemType: event.itemType,
          contextualInfo: event.contextualInfo || {},
          masteryBefore: currentMastery,
          masteryAfter: newMastery,
        },
      })

      // Update knowledge state
      await updateKnowledgeState(event.userId, event.conceptKey, newMastery, params, evidence)

      // Update bandit statistics if item was provided
      if (event.itemId) {
        const reward = event.correct ? 1 : 0
        await updateBanditStats(event.userId, event.conceptKey, event.itemId, reward)
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

      reply.send({
        eventId: learningEvent.id,
        masteryBefore: currentMastery,
        masteryAfter: newMastery,
        evidence,
        learningRate: (newMastery - currentMastery) / Math.max(evidence, 0.001),
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'Learning event processing error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Get next recommended item using advanced algorithms
app.post(
  '/recommendation',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const req = RecommendationRequestSchema.parse(request.body)

      // Get user's current knowledge state
      const knowledgeState = await getUserKnowledgeState(req.userId, req.conceptKey)
      const userMastery = knowledgeState?.currentMastery || 0.1

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
        timeOfDay: req.contextualInfo?.timeOfDay || now.getHours() + ':' + now.getMinutes(),
        sessionGoal: req.sessionGoal,
        fatigueLevel: req.contextualInfo?.fatigueLevel || 0.2,
        previousPerformance: knowledgeState
          ? knowledgeState.correctAnswers / Math.max(knowledgeState.totalInteractions, 1)
          : 0.5,
        conceptDifficulty: 0.5, // Would be determined by concept metadata
        studyStreak: req.contextualInfo?.studyStreak || 1,
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

      if (!selection) {
        return reply.code(404).send({ error: 'No suitable items available' })
      }

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
      if (kafka) {
        const producer = kafka.producer()
        await producer.connect()
        await producer.send({
          topic: 'recommendations.decisions.v1',
          messages: [
            {
              key: req.userId,
              value: JSON.stringify(decision),
            },
          ],
        })
        await producer.disconnect()
      }

      reply.send({
        itemId: selection.selectedArm.id,
        expectedSuccessRate: selection.expectedReward,
        difficulty: selection.selectedArm.difficulty,
        engagement: selection.selectedArm.engagement,
        recommendation: {
          confidence: selection.expectedReward,
          reasoning: 'Selected based on Multi-Armed Bandit with contextual features',
          userMastery,
          decisionId: decision.decisionId,
        },
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'Recommendation error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Update spaced repetition schedule
app.post(
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
      const params: EnhancedSRParams = current
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
        confidence: data.confidence,
        difficulty: data.difficulty,
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
          totalReviews: { increment: 1 },
          successRate: data.quality >= 3 ? { increment: 0.1 } : { increment: -0.1 },
        },
      })

      reply.send({
        nextReview,
        interval: newParams.interval,
        easeFactor: newParams.easeFactor,
        repetitions: newParams.repetitions,
        confidence,
        reviewBurden: newParams.reviewBurden,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'Spaced repetition error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Get user's knowledge state
app.get(
  '/knowledge-state/:userId/:conceptKey',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const { userId, conceptKey } = request.params

      const knowledgeState = await getUserKnowledgeState(userId, conceptKey)

      if (!knowledgeState) {
        return reply.code(404).send({ error: 'Knowledge state not found' })
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
      const masteryHistory = recentEvents.map((e) => e.masteryAfter || 0).reverse()
      const learningRate = BayesianKnowledgeTracing.calculateLearningRate(masteryHistory)

      reply.send({
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
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Get due items for spaced repetition
app.get(
  '/due-reviews/:userId',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const { userId } = request.params
      const { lookaheadHours = 24 } = request.query

      const cutoffTime = new Date(Date.now() + parseInt(lookaheadHours) * 60 * 60 * 1000)

      const dueReviews = await prisma.spacedRepetition.findMany({
        where: {
          userId,
          nextReview: {
            lte: cutoffTime,
          },
        },
        orderBy: { nextReview: 'asc' },
      })

      const reviews = dueReviews.map((review) => {
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

      reply.send({
        totalDue: reviews.length,
        reviews: reviews.slice(0, 50), // Limit to 50 items
      })
    } catch (error) {
      app.log.error(error, 'Due reviews error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// ML-enhanced recommendation endpoint
app.post(
  '/ml-recommendation',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const req = RecommendationRequestSchema.parse(request.body)

      // Get user's current knowledge state
      const knowledgeState = await getUserKnowledgeState(req.userId, req.conceptKey)

      // Get enhanced recommendations using ML
      const recommendations = await mlService
        .getEnhancedRecommendations(
          req.userId,
          req.conceptKey,
          knowledgeState,
          req.contextualInfo || {},
          {
            maxItems: req.maxItems,
            contentType: req.contextualInfo?.contentType,
            targetDifficulty: knowledgeState?.currentMastery
              ? knowledgeState.currentMastery + 0.1
              : undefined,
          },
        )
        .catch((error) => {
          app.log.warn('ML recommendations failed, falling back to algorithmic approach:', error)
          return []
        })

      if (recommendations.length === 0) {
        // Fallback to existing MAB algorithm
        return reply.redirect(307, '/recommendation')
      }

      reply.send({
        recommendations: recommendations.slice(0, req.maxItems),
        source: 'ml-enhanced',
        timestamp: new Date().toISOString(),
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'ML recommendation error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Get ML insights for user
app.get(
  '/ml-insights/:userId',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
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

      if (!userProfile) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Convert knowledge states to map
      const knowledgeStateMap = knowledgeStates.reduce(
        (acc, ks) => {
          acc[ks.conceptKey] = ks
          return acc
        },
        {} as Record<string, any>,
      )

      // Get ML insights
      const insights = await mlService
        .getUserMLInsights(userId, userProfile, knowledgeStateMap, recentActivity)
        .catch((error) => {
          app.log.warn('ML insights failed, using basic analytics:', error)
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

      reply.send({
        userId,
        insights,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      app.log.error(error, 'ML insights error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Update user profile for ML
app.post(
  '/ml-profile-update',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const { userId } = request.body

      if (!userId) {
        return reply.code(400).send({ error: 'userId is required' })
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

      if (!userProfile) {
        return reply.code(404).send({ error: 'User not found' })
      }

      // Convert knowledge states to mastery map
      const knowledgeStateMap = knowledgeStates.reduce(
        (acc, ks) => {
          acc[ks.conceptKey] = ks.currentMastery
          return acc
        },
        {} as Record<string, number>,
      )

      // Update user profile in vector database
      await mlService.updateUserProfile(
        userId,
        recentActivity,
        userProfile.preferences || {},
        knowledgeStateMap,
      )

      reply.send({
        success: true,
        message: 'User profile updated in ML system',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      app.log.error(error, 'ML profile update error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Index content for ML recommendations
app.post(
  '/ml-index-content',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const content = request.body

      if (!content.id || !content.title || !content.conceptKey) {
        return reply.code(400).send({ error: 'Missing required content fields' })
      }

      await mlService.indexContent({
        id: content.id,
        title: content.title,
        description: content.description || '',
        conceptKey: content.conceptKey,
        difficulty: content.difficulty || 0.5,
        contentType: content.contentType || 'question',
        tags: content.tags || [],
      })

      reply.send({
        success: true,
        message: 'Content indexed for ML recommendations',
        contentId: content.id,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      app.log.error(error, 'ML content indexing error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Graceful shutdown
process.on('SIGINT', async () => {
  app.log.info('Shutting down gracefully...')
  await prisma.$disconnect()
  if (redis) await redis.disconnect()
  mlService.dispose()
  process.exit(0)
})

app
  .listen({ port: env.PORT || 3002, host: '0.0.0.0' })
  .then(() => app.log.info(`adaptive-svc listening on ${env.PORT || 3002}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
