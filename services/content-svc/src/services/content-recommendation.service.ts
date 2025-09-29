import { eq, and, desc, asc, sql, gte, lte, inArray, ne } from 'drizzle-orm'
import { db, items, concepts, categories, contentAnalytics } from '../db/connection.js'
import { ContentAnalyticsService } from './content-analytics.service.js'

export interface UserProfile {
  userId: string
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading'
  difficultyPreference: number // 0-1 scale
  avgResponseTime: number
  successRate: number
  engagementScore: number
  preferredContentTypes: string[]
  weakConcepts: string[]
  strongConcepts: string[]
  studyPatterns: {
    preferredTimeOfDay: 'morning' | 'afternoon' | 'evening'
    sessionDuration: number
    frequency: number
  }
}

export interface ContentRecommendation {
  itemId: string
  score: number
  reason: string
  confidence: number
  metadata: {
    difficulty: number
    estimatedTime: number
    contentType: string
    conceptKey: string
    categoryKey: string
  }
}

export interface RecommendationContext {
  userId: string
  currentConceptId?: string
  sessionGoals?: string[]
  timeAvailable?: number // minutes
  deviceType?: 'mobile' | 'tablet' | 'desktop'
  previousItems?: string[]
  targetDifficulty?: number
}

export class ContentRecommendationService {
  private analyticsService: ContentAnalyticsService

  constructor() {
    this.analyticsService = new ContentAnalyticsService()
  }

  // Generate personalized content recommendations
  async getPersonalizedRecommendations(
    context: RecommendationContext,
    limit = 10,
  ): Promise<ContentRecommendation[]> {
    // Get user profile
    const userProfile = await this.getUserProfile(context.userId)

    // Get candidate items
    const candidates = await this.getCandidateItems(context)

    // Score each candidate
    const scoredRecommendations = await Promise.all(
      candidates.map(async (item) => {
        const score = await this.calculateRecommendationScore(item, userProfile, context)
        return {
          itemId: item.id,
          score: score.totalScore,
          reason: score.reason,
          confidence: score.confidence,
          metadata: {
            difficulty: item.difficulty,
            estimatedTime: item.estimatedTime || 0,
            contentType: item.type,
            conceptKey: item.concept?.key || '',
            categoryKey: item.concept?.category?.key || '',
          },
        }
      }),
    )

    // Sort by score and return top recommendations
    return scoredRecommendations.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  // Get content recommendations based on user performance patterns
  async getAdaptiveRecommendations(
    userId: string,
    conceptId: string,
    limit = 5,
  ): Promise<ContentRecommendation[]> {
    const userProfile = await this.getUserProfile(userId)

    // Get user's recent performance on this concept
    const recentPerformance = await this.getRecentConceptPerformance(userId, conceptId)

    // Determine optimal difficulty based on performance
    const targetDifficulty = this.calculateOptimalDifficulty(recentPerformance, userProfile)

    // Get items matching the target difficulty
    const candidates = await db.query.items.findMany({
      where: and(
        eq(items.conceptId, conceptId),
        eq(items.isActive, true),
        gte(items.difficulty, targetDifficulty - 0.1),
        lte(items.difficulty, targetDifficulty + 0.1),
      ),
      with: {
        concept: {
          with: {
            category: true,
          },
        },
      },
      limit: limit * 2, // Get more to filter
    })

    // Score and filter recommendations
    const recommendations = await Promise.all(
      candidates.map(async (item) => {
        const effectiveness = await this.analyticsService.getContentEffectiveness(item.id, {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        })

        // Calculate adaptive score based on user needs
        const adaptiveScore = this.calculateAdaptiveScore(
          item,
          effectiveness,
          userProfile,
          recentPerformance,
        )

        return {
          itemId: item.id,
          score: adaptiveScore.score,
          reason: adaptiveScore.reason,
          confidence: adaptiveScore.confidence,
          metadata: {
            difficulty: item.difficulty,
            estimatedTime: item.estimatedTime || 0,
            contentType: item.type,
            conceptKey: item.concept?.key || '',
            categoryKey: item.concept?.category?.key || '',
          },
        }
      }),
    )

    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  // Get similar high-performing content
  async getSimilarContent(itemId: string, limit = 5): Promise<ContentRecommendation[]> {
    const sourceItem = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: {
        concept: {
          with: {
            category: true,
          },
        },
      },
    })

    if (!sourceItem) {
      throw new Error('Source item not found')
    }

    // Find similar items based on multiple criteria
    const similarItems = await db.query.items.findMany({
      where: and(
        ne(items.id, itemId), // Exclude the source item
        eq(items.isActive, true),
        // Same concept or category
        sql`(${items.conceptId} = ${sourceItem.conceptId} OR ${items.conceptId} IN (
          SELECT id FROM concepts WHERE category_id = ${sourceItem.concept?.categoryId}
        ))`,
        // Similar difficulty range
        gte(items.difficulty, sourceItem.difficulty - 0.2),
        lte(items.difficulty, sourceItem.difficulty + 0.2),
        // Same content type preference
        eq(items.type, sourceItem.type),
      ),
      with: {
        concept: {
          with: {
            category: true,
          },
        },
      },
      limit: limit * 2,
    })

    // Score based on similarity and performance
    const recommendations = await Promise.all(
      similarItems.map(async (item) => {
        const effectiveness = await this.analyticsService.getContentEffectiveness(item.id, {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        })

        const similarityScore = this.calculateSimilarityScore(sourceItem, item)
        const performanceScore = effectiveness.qualityScore
        const totalScore = similarityScore * 0.4 + performanceScore * 0.6

        return {
          itemId: item.id,
          score: totalScore,
          reason: `Similar to high-performing content with ${Math.round(effectiveness.successRate * 100)}% success rate`,
          confidence: 0.8,
          metadata: {
            difficulty: item.difficulty,
            estimatedTime: item.estimatedTime || 0,
            contentType: item.type,
            conceptKey: item.concept?.key || '',
            categoryKey: item.concept?.category?.key || '',
          },
        }
      }),
    )

    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  // Get trending/popular content
  async getTrendingContent(
    categoryId?: string,
    timeWindow = 7, // days
    limit = 10,
  ): Promise<ContentRecommendation[]> {
    const startDate = new Date(Date.now() - timeWindow * 24 * 60 * 60 * 1000)

    // Get content with high engagement in the time window
    const trendingData = await db
      .select({
        itemId: contentAnalytics.entityId,
        totalViews: sql<number>`SUM(${contentAnalytics.totalViews})`,
        totalAttempts: sql<number>`SUM(${contentAnalytics.totalAttempts})`,
        avgEngagement: sql<number>`AVG(${contentAnalytics.engagementScore})`,
        successRate: sql<number>`CASE WHEN SUM(${contentAnalytics.totalAttempts}) > 0 THEN SUM(${contentAnalytics.successfulAttempts})::float / SUM(${contentAnalytics.totalAttempts}) ELSE 0 END`,
      })
      .from(contentAnalytics)
      .where(
        and(eq(contentAnalytics.entityType, 'item'), gte(contentAnalytics.periodStart, startDate)),
      )
      .groupBy(contentAnalytics.entityId)
      .having(sql`SUM(${contentAnalytics.totalViews}) >= 10`) // Minimum views for trending
      .orderBy(desc(sql`SUM(${contentAnalytics.totalViews})`))
      .limit(limit * 2)

    // Get item details and calculate trending scores
    const recommendations = await Promise.all(
      trendingData.map(async (data) => {
        const item = await db.query.items.findFirst({
          where: eq(items.id, data.itemId),
          with: {
            concept: {
              with: {
                category: true,
              },
            },
          },
        })

        if (!item || (categoryId && item.concept?.categoryId !== categoryId)) {
          return null
        }

        // Calculate trending score based on views, engagement, and recency
        const viewScore = Math.min(1, data.totalViews / 100) // Normalize views
        const engagementScore = data.avgEngagement
        const successScore = data.successRate
        const trendingScore = viewScore * 0.4 + engagementScore * 0.3 + successScore * 0.3

        return {
          itemId: item.id,
          score: trendingScore,
          reason: `Trending content with ${data.totalViews} views and ${Math.round(data.avgEngagement * 100)}% engagement`,
          confidence: 0.7,
          metadata: {
            difficulty: item.difficulty,
            estimatedTime: item.estimatedTime || 0,
            contentType: item.type,
            conceptKey: item.concept?.key || '',
            categoryKey: item.concept?.category?.key || '',
          },
        }
      }),
    )

    return recommendations
      .filter((rec): rec is ContentRecommendation => rec !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  // Private helper methods
  private async getUserProfile(userId: string): Promise<UserProfile> {
    // In a real implementation, this would fetch from user analytics
    // For now, return a default profile
    return {
      userId,
      learningStyle: 'visual',
      difficultyPreference: 0.6,
      avgResponseTime: 45000,
      successRate: 0.75,
      engagementScore: 0.7,
      preferredContentTypes: ['MULTIPLE_CHOICE', 'SCENARIO'],
      weakConcepts: [],
      strongConcepts: [],
      studyPatterns: {
        preferredTimeOfDay: 'evening',
        sessionDuration: 30,
        frequency: 5,
      },
    }
  }

  private async getCandidateItems(context: RecommendationContext) {
    let query = db.query.items.findMany({
      where: and(eq(items.isActive, true), eq(items.status, 'PUBLISHED')),
      with: {
        concept: {
          with: {
            category: true,
          },
        },
      },
      limit: 50, // Get a larger pool to score
    })

    // Filter by concept if specified
    if (context.currentConceptId) {
      query = db.query.items.findMany({
        where: and(
          eq(items.conceptId, context.currentConceptId),
          eq(items.isActive, true),
          eq(items.status, 'PUBLISHED'),
        ),
        with: {
          concept: {
            with: {
              category: true,
            },
          },
        },
        limit: 50,
      })
    }

    const candidates = await query

    // Filter out previously seen items
    if (context.previousItems && context.previousItems.length > 0) {
      return candidates.filter((item) => !context.previousItems!.includes(item.id))
    }

    return candidates
  }

  private async calculateRecommendationScore(
    item: any,
    userProfile: UserProfile,
    context: RecommendationContext,
  ) {
    let totalScore = 0.5 // Base score
    let confidence = 0.5
    const reasons: string[] = []

    // Difficulty matching
    const difficultyMatch = 1 - Math.abs(item.difficulty - userProfile.difficultyPreference)
    totalScore += difficultyMatch * 0.25
    if (difficultyMatch > 0.8) {
      reasons.push('matches your preferred difficulty level')
      confidence += 0.1
    }

    // Content type preference
    if (userProfile.preferredContentTypes.includes(item.type)) {
      totalScore += 0.2
      reasons.push('matches your preferred content type')
      confidence += 0.1
    }

    // Time availability
    if (context.timeAvailable && item.estimatedTime) {
      if (item.estimatedTime <= context.timeAvailable * 60) {
        // Convert minutes to seconds
        totalScore += 0.15
        reasons.push('fits your available time')
      } else {
        totalScore -= 0.1
        reasons.push('may take longer than available time')
      }
    }

    // Device optimization
    if (context.deviceType === 'mobile' && item.type === 'INTERACTIVE') {
      totalScore -= 0.1 // Interactive content may not work well on mobile
    }

    // Get content effectiveness
    const effectiveness = await this.analyticsService.getContentEffectiveness(item.id, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    })

    // Content quality score
    totalScore += effectiveness.qualityScore * 0.3
    if (effectiveness.qualityScore > 0.8) {
      reasons.push('high-quality content with good user outcomes')
      confidence += 0.15
    }

    // Engagement score
    if (effectiveness.engagementScore > 0.7) {
      totalScore += 0.1
      reasons.push('highly engaging content')
    }

    const reason = reasons.length > 0 ? reasons.join(', ') : 'recommended based on your profile'

    return {
      totalScore: Math.max(0, Math.min(1, totalScore)),
      reason,
      confidence: Math.max(0, Math.min(1, confidence)),
    }
  }

  private async getRecentConceptPerformance(userId: string, conceptId: string) {
    // In a real implementation, this would query user performance data
    // For now, return mock data
    return {
      averageScore: 0.75,
      attempts: 15,
      lastAttempt: new Date(),
      trend: 'improving', // 'improving', 'stable', 'declining'
      strugglingAreas: [],
    }
  }

  private calculateOptimalDifficulty(recentPerformance: any, userProfile: UserProfile): number {
    const basePreference = userProfile.difficultyPreference
    const performanceAdjustment = (recentPerformance.averageScore - 0.7) * 0.2 // Adjust based on performance

    // If user is performing well, slightly increase difficulty
    // If struggling, slightly decrease difficulty
    return Math.max(0.1, Math.min(0.9, basePreference + performanceAdjustment))
  }

  private calculateAdaptiveScore(
    item: any,
    effectiveness: any,
    userProfile: UserProfile,
    recentPerformance: any,
  ) {
    let score = 0.5
    const reasons: string[] = []

    // Performance-based scoring
    if (
      recentPerformance.trend === 'declining' &&
      item.difficulty < userProfile.difficultyPreference
    ) {
      score += 0.3
      reasons.push('easier content to build confidence')
    } else if (
      recentPerformance.trend === 'improving' &&
      item.difficulty > userProfile.difficultyPreference
    ) {
      score += 0.2
      reasons.push('challenging content to maintain growth')
    }

    // Content effectiveness
    score += effectiveness.qualityScore * 0.4

    // Success rate matching
    const targetSuccessRate = 0.75 // Optimal learning zone
    if (Math.abs(effectiveness.successRate - targetSuccessRate) < 0.1) {
      score += 0.2
      reasons.push('optimal challenge level')
    }

    const reason = reasons.length > 0 ? reasons.join(', ') : 'adaptive recommendation'

    return {
      score: Math.max(0, Math.min(1, score)),
      reason,
      confidence: 0.8,
    }
  }

  private calculateSimilarityScore(sourceItem: any, targetItem: any): number {
    let similarity = 0

    // Same concept
    if (sourceItem.conceptId === targetItem.conceptId) {
      similarity += 0.4
    }

    // Same category
    if (sourceItem.concept?.categoryId === targetItem.concept?.categoryId) {
      similarity += 0.2
    }

    // Similar difficulty
    const difficultyDiff = Math.abs(sourceItem.difficulty - targetItem.difficulty)
    similarity += Math.max(0, 0.2 - difficultyDiff) * 2 // 0.2 max difference for full points

    // Same content type
    if (sourceItem.type === targetItem.type) {
      similarity += 0.2
    }

    return Math.max(0, Math.min(1, similarity))
  }
}
