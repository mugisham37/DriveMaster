import { eq, and, asc, sql, gte, lte, avg, sum } from 'drizzle-orm'

import { db, items, contentAnalytics } from '../db/connection.js'

export interface ContentEffectivenessMetrics {
  itemId: string
  totalViews: number
  totalAttempts: number
  successRate: number
  avgResponseTime: number
  avgConfidence: number
  engagementScore: number
  // cSpell:ignore dropoff
  dropOffRate: number
  knowledgeGain: number
  retentionRate: number
  difficultyRating: number
  qualityScore: number
}

export interface ContentRecommendation {
  itemId: string
  recommendationType: 'improve' | 'retire' | 'promote' | 'review'
  priority: 'high' | 'medium' | 'low'
  reason: string
  suggestedActions: string[]
  expectedImpact: number
  confidence: number
}

export interface UserInteractionEvent {
  userId: string
  itemId: string
  conceptId: string
  eventType: 'view' | 'attempt' | 'complete' | 'skip' | 'hint_used' | 'feedback_given'
  isCorrect?: boolean
  responseTime?: number
  confidence?: number
  hintsUsed?: number
  attemptsCount?: number
  engagementScore?: number
  deviceType?: string
  sessionId?: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface ContentQualityAssessment {
  itemId: string
  qualityScore: number
  issues: Array<{
    type: 'clarity' | 'difficulty' | 'engagement' | 'accuracy' | 'bias'
    severity: 'low' | 'medium' | 'high'
    description: string
    suggestedFix: string
  }>
  recommendations: string[]
  lastAssessed: Date
}

export class ContentAnalyticsService {
  // Track user interactions with content
  async trackUserInteraction(interaction: UserInteractionEvent): Promise<void> {
    const period = 'daily'
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)

    // Calculate engagement score if not provided
    const engagementScore =
      interaction.engagementScore ?? this.calculateEngagementScore(interaction)

    // Update content analytics
    await db
      .insert(contentAnalytics)
      .values({
        entityType: 'item',
        entityId: interaction.itemId,
        period,
        periodStart,
        periodEnd,
        totalViews: interaction.eventType === 'view' ? 1 : 0,
        totalAttempts: interaction.eventType === 'attempt' ? 1 : 0,
        successfulAttempts: interaction.isCorrect === true ? 1 : 0,
        avgResponseTime: interaction.responseTime ?? 0,
        avgConfidence: interaction.confidence ?? 0,
        engagementScore,
        dropOffRate: interaction.eventType === 'skip' ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [
          contentAnalytics.entityType,
          contentAnalytics.entityId,
          contentAnalytics.period,
          contentAnalytics.periodStart,
        ],
        set: {
          totalViews: sql`${contentAnalytics.totalViews} + ${interaction.eventType === 'view' ? 1 : 0}`,
          totalAttempts: sql`${contentAnalytics.totalAttempts} + ${interaction.eventType === 'attempt' ? 1 : 0}`,
          successfulAttempts: sql`${contentAnalytics.successfulAttempts} + ${interaction.isCorrect === true ? 1 : 0}`,
          avgResponseTime:
            typeof interaction.responseTime === 'number' && interaction.responseTime > 0
              ? sql`(${contentAnalytics.avgResponseTime} * ${contentAnalytics.totalAttempts} + ${interaction.responseTime}) / (${contentAnalytics.totalAttempts} + 1)`
              : sql`${contentAnalytics.avgResponseTime}`,
          avgConfidence:
            typeof interaction.confidence === 'number' && interaction.confidence > 0
              ? sql`(${contentAnalytics.avgConfidence} * ${contentAnalytics.totalAttempts} + ${interaction.confidence}) / (${contentAnalytics.totalAttempts} + 1)`
              : sql`${contentAnalytics.avgConfidence}`,
          engagementScore: sql`(${contentAnalytics.engagementScore} * ${contentAnalytics.totalAttempts} + ${engagementScore}) / (${contentAnalytics.totalAttempts} + 1)`,
          dropOffRate: sql`(${contentAnalytics.dropOffRate} * ${contentAnalytics.totalViews} + ${interaction.eventType === 'skip' ? 1 : 0}) / (${contentAnalytics.totalViews} + 1)`,
        },
      })

    // Update item-level performance metrics
    await this.updateItemPerformanceMetrics(interaction.itemId, interaction)

    // Update concept-level analytics
    await this.updateConceptAnalytics(interaction.conceptId, interaction)
  }

  // Get comprehensive content effectiveness metrics
  async getContentEffectiveness(
    itemId: string,
    timeRange: { start: Date; end: Date },
  ): Promise<ContentEffectivenessMetrics> {
    const analytics = await db
      .select({
        totalViews: sum(contentAnalytics.totalViews),
        totalAttempts: sum(contentAnalytics.totalAttempts),
        successfulAttempts: sum(contentAnalytics.successfulAttempts),
        avgResponseTime: avg(contentAnalytics.avgResponseTime),
        avgConfidence: avg(contentAnalytics.avgConfidence),
        avgEngagement: avg(contentAnalytics.engagementScore),
        avgDropoff: avg(contentAnalytics.dropOffRate),
        avgKnowledgeGain: avg(contentAnalytics.knowledgeGain),
        avgRetention: avg(contentAnalytics.retentionRate),
        avgDifficulty: avg(contentAnalytics.difficultyRating),
      })
      .from(contentAnalytics)
      .where(
        and(
          eq(contentAnalytics.entityType, 'item'),
          eq(contentAnalytics.entityId, itemId),
          gte(contentAnalytics.periodStart, timeRange.start),
          lte(contentAnalytics.periodEnd, timeRange.end),
        ),
      )

    const result = analytics[0]
    if (!result) {
      // Return default metrics if no data found
      return {
        itemId,
        totalViews: 0,
        totalAttempts: 0,
        successRate: 0,
        avgResponseTime: 0,
        avgConfidence: 0,
        engagementScore: 0,
        dropOffRate: 0,
        knowledgeGain: 0,
        retentionRate: 0,
        difficultyRating: 0,
        qualityScore: 0,
      }
    }

    const totalAttempts = Number(result.totalAttempts) !== 0 ? Number(result.totalAttempts) : 0
    const successfulAttempts =
      Number(result.successfulAttempts) !== 0 ? Number(result.successfulAttempts) : 0
    const successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0

    // Calculate quality score based on multiple factors
    const avgEngagement = Number(result.avgEngagement) !== 0 ? Number(result.avgEngagement) : 0
    const avgResponseTime =
      Number(result.avgResponseTime) !== 0 ? Number(result.avgResponseTime) : 0
    const avgDropoff = Number(result.avgDropoff) !== 0 ? Number(result.avgDropoff) : 0
    const avgKnowledgeGain =
      Number(result.avgKnowledgeGain) !== 0 ? Number(result.avgKnowledgeGain) : 0

    const qualityScore = this.calculateQualityScore({
      successRate,
      engagementScore: avgEngagement,
      responseTime: avgResponseTime,
      dropOffRate: avgDropoff,
      knowledgeGain: avgKnowledgeGain,
    })

    return {
      itemId,
      totalViews: Number(result.totalViews) !== 0 ? Number(result.totalViews) : 0,
      totalAttempts,
      successRate,
      avgResponseTime,
      avgConfidence: Number(result.avgConfidence) !== 0 ? Number(result.avgConfidence) : 0,
      engagementScore: avgEngagement,
      dropOffRate: avgDropoff,
      knowledgeGain: avgKnowledgeGain,
      retentionRate: Number(result.avgRetention) !== 0 ? Number(result.avgRetention) : 0,
      difficultyRating: Number(result.avgDifficulty) !== 0 ? Number(result.avgDifficulty) : 0,
      qualityScore,
    }
  }

  // Generate content recommendations based on performance data
  async generateContentRecommendations(
    conceptId?: string,
    limit = 20,
  ): Promise<ContentRecommendation[]> {
    const timeRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date(),
    }

    // Get items to analyze
    const whereConditions = [eq(items.isActive, true)]

    if (typeof conceptId === 'string' && conceptId.length > 0) {
      whereConditions.push(eq(items.conceptId, conceptId))
    }

    const itemsToAnalyze = await db
      .select()
      .from(items)
      .where(and(...whereConditions))
      .limit(limit * 2) // Get more to filter

    const recommendations: ContentRecommendation[] = []

    for (const item of itemsToAnalyze) {
      const effectiveness = await this.getContentEffectiveness(item.id, timeRange)
      const recommendation = this.analyzeItemPerformance(item, effectiveness)

      if (recommendation) {
        recommendations.push(recommendation)
      }
    }

    // Sort by priority and confidence
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return b.confidence - a.confidence
      })
      .slice(0, limit)
  }

  // Automated content quality assessment
  async assessContentQuality(itemId: string): Promise<ContentQualityAssessment> {
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: {
        concept: {
          with: {
            category: true,
          },
        },
      },
    })

    if (!item) {
      throw new Error('Item not found')
    }

    const effectiveness = await this.getContentEffectiveness(itemId, {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    })

    const issues = []
    const recommendations = []

    // Assess clarity based on response time and success rate
    if (effectiveness.avgResponseTime > 60000 && effectiveness.successRate < 0.6) {
      issues.push({
        type: 'clarity' as const,
        severity: 'high' as const,
        description: 'High response time combined with low success rate suggests unclear content',
        suggestedFix: 'Simplify language, add visual aids, or break into smaller parts',
      })
      recommendations.push('Rewrite content for better clarity')
    }

    // Assess difficulty calibration
    if (effectiveness.successRate < 0.3) {
      issues.push({
        type: 'difficulty' as const,
        severity: 'high' as const,
        description: 'Very low success rate indicates content may be too difficult',
        suggestedFix: 'Reduce difficulty or add prerequisite content',
      })
      recommendations.push('Adjust difficulty level or add scaffolding')
    } else if (effectiveness.successRate > 0.95) {
      issues.push({
        type: 'difficulty' as const,
        severity: 'medium' as const,
        description: 'Very high success rate suggests content may be too easy',
        suggestedFix: 'Increase complexity or add advanced variations',
      })
      recommendations.push('Consider increasing difficulty for better learning challenge')
    }

    // Assess engagement
    if (effectiveness.engagementScore < 0.4) {
      issues.push({
        type: 'engagement' as const,
        severity: 'medium' as const,
        description: 'Low engagement score indicates content may be boring or irrelevant',
        suggestedFix: 'Add interactive elements, real-world examples, or gamification',
      })
      recommendations.push('Enhance content with interactive elements')
    }

    // Assess dropoff rate
    // cSpell:ignore dropoff
    if (effectiveness.dropOffRate > 0.3) {
      issues.push({
        type: 'engagement' as const,
        severity: 'high' as const,
        description: 'High dropoff rate suggests users are abandoning this content',
        suggestedFix: 'Review content relevance and presentation format',
      })
      recommendations.push('Investigate and address high abandonment rate')
    }

    // Calculate overall quality score
    const qualityScore = effectiveness.qualityScore

    return {
      itemId,
      qualityScore,
      issues,
      recommendations,
      lastAssessed: new Date(),
    }
  }

  // Get content performance trends
  async getContentPerformanceTrends(
    itemId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days = 30,
  ): Promise<
    Array<{
      date: Date
      successRate: number
      engagementScore: number
      avgResponseTime: number
      totalAttempts: number
      dropOffRate: number
    }>
  > {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const trends = await db
      .select()
      .from(contentAnalytics)
      .where(
        and(
          eq(contentAnalytics.entityType, 'item'),
          eq(contentAnalytics.entityId, itemId),
          eq(contentAnalytics.period, period),
          gte(contentAnalytics.periodStart, startDate),
        ),
      )
      .orderBy(asc(contentAnalytics.periodStart))

    return trends.map((trend) => {
      const totalAttempts = trend.totalAttempts ?? 0
      const successfulAttempts = trend.successfulAttempts ?? 0

      return {
        date: trend.periodStart,
        successRate: totalAttempts > 0 ? successfulAttempts / totalAttempts : 0,
        engagementScore: trend.engagementScore ?? 0,
        avgResponseTime: trend.avgResponseTime ?? 0,
        totalAttempts,
        dropOffRate: trend.dropOffRate ?? 0,
      }
    })
  }

  // Get top performing content
  async getTopPerformingContent(
    conceptId?: string,
    categoryId?: string,
    limit = 10,
    metric: 'success_rate' | 'engagement' | 'quality_score' = 'quality_score',
  ): Promise<
    Array<{
      item: typeof items.$inferSelect | null
      successRate: number
      engagementScore: number
      qualityScore: number
      totalAttempts: number
    }>
  > {
    const timeRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }

    // Get aggregated performance data
    const performanceData = await db
      .select({
        itemId: contentAnalytics.entityId,
        avgSuccessRate: sql<number>`CASE WHEN SUM(${contentAnalytics.totalAttempts}) > 0 THEN SUM(${contentAnalytics.successfulAttempts})::float / SUM(${contentAnalytics.totalAttempts}) ELSE 0 END`,
        avgEngagement: avg(contentAnalytics.engagementScore),
        totalAttempts: sum(contentAnalytics.totalAttempts),
      })
      .from(contentAnalytics)
      .where(
        and(
          eq(contentAnalytics.entityType, 'item'),
          gte(contentAnalytics.periodStart, timeRange.start),
          lte(contentAnalytics.periodEnd, timeRange.end),
        ),
      )
      .groupBy(contentAnalytics.entityId)
      .having(sql`SUM(${contentAnalytics.totalAttempts}) >= 10`) // Minimum attempts for statistical significance

    // Calculate quality scores and sort
    const contentWithScores = await Promise.all(
      performanceData.map(async (data) => {
        const avgEngagement = Number(data.avgEngagement) !== 0 ? Number(data.avgEngagement) : 0
        const qualityScore = this.calculateQualityScore({
          successRate: data.avgSuccessRate,
          engagementScore: avgEngagement,
          responseTime: 0, // Would need to calculate separately
          dropOffRate: 0, // Would need to calculate separately
          knowledgeGain: 0, // Would need to calculate separately
        })

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

        return {
          item,
          successRate: data.avgSuccessRate,
          engagementScore: avgEngagement,
          qualityScore,
          totalAttempts: Number(data.totalAttempts),
        }
      }),
    )

    // Filter by concept/category if specified
    let filteredContent = contentWithScores.filter((c) => c.item)

    if (typeof conceptId === 'string' && conceptId.length > 0) {
      filteredContent = filteredContent.filter((c) => c.item?.conceptId === conceptId)
    }

    if (typeof categoryId === 'string' && categoryId.length > 0) {
      filteredContent = filteredContent.filter((c) => c.item?.concept?.categoryId === categoryId)
    }

    // Sort by selected metric
    filteredContent.sort((a, b) => {
      switch (metric) {
        case 'success_rate':
          return b.successRate - a.successRate
        case 'engagement':
          return b.engagementScore - a.engagementScore
        case 'quality_score':
        default:
          return b.qualityScore - a.qualityScore
      }
    })

    return filteredContent.slice(0, limit).map((content) => ({
      ...content,
      item: content.item ?? null,
    }))
  }

  // Private helper methods
  private calculateEngagementScore(interaction: UserInteractionEvent): number {
    let score = 0.5 // Base score

    // Positive engagement indicators
    if (interaction.eventType === 'complete') score += 0.3
    if (interaction.isCorrect === true) score += 0.2
    if (typeof interaction.confidence === 'number' && interaction.confidence >= 4) score += 0.1
    if (typeof interaction.responseTime === 'number' && interaction.responseTime < 30000)
      score += 0.1

    // Negative engagement indicators
    if (interaction.eventType === 'skip') score -= 0.4
    if (typeof interaction.hintsUsed === 'number' && interaction.hintsUsed > 2) score -= 0.1
    if (typeof interaction.attemptsCount === 'number' && interaction.attemptsCount > 3) score -= 0.1

    return Math.max(0, Math.min(1, score))
  }

  private calculateQualityScore(metrics: {
    successRate: number
    engagementScore: number
    responseTime: number
    dropOffRate: number
    knowledgeGain: number
  }): number {
    // Weighted quality score calculation
    const weights = {
      successRate: 0.25,
      engagementScore: 0.25,
      responseTime: 0.15, // Lower is better
      // cSpell:ignore dropoff
      dropoffRate: 0.15, // Lower is better
      knowledgeGain: 0.2,
    }

    // Normalize response time (assume 30s is optimal, penalize longer times)
    const normalizedResponseTime = Math.max(0, 1 - (metrics.responseTime - 30000) / 60000)

    // Invert dropoff rate (lower is better)
    // cSpell:ignore dropoff
    const invertedDropoffRate = 1 - metrics.dropOffRate

    const score =
      metrics.successRate * weights.successRate +
      metrics.engagementScore * weights.engagementScore +
      normalizedResponseTime * weights.responseTime +
      invertedDropoffRate * weights.dropoffRate +
      metrics.knowledgeGain * weights.knowledgeGain

    return Math.max(0, Math.min(1, score))
  }

  private analyzeItemPerformance(
    item: typeof items.$inferSelect,
    effectiveness: ContentEffectivenessMetrics,
  ): ContentRecommendation | null {
    // Skip items with insufficient data
    if (effectiveness.totalAttempts < 10) {
      return null
    }

    const recommendations: ContentRecommendation = {
      itemId: item.id,
      recommendationType: 'review',
      priority: 'low',
      reason: '',
      suggestedActions: [],
      expectedImpact: 0,
      confidence: 0.5,
    }

    // Analyze performance patterns
    if (effectiveness.successRate < 0.3 && effectiveness.engagementScore < 0.4) {
      recommendations.recommendationType = 'retire'
      recommendations.priority = 'high'
      recommendations.reason = 'Poor performance across all metrics'
      recommendations.suggestedActions = [
        'Consider removing or completely redesigning this content',
        'Analyze user feedback for specific issues',
        'Replace with alternative content covering the same concept',
      ]
      recommendations.expectedImpact = 0.8
      recommendations.confidence = 0.9
    } else if (effectiveness.successRate > 0.8 && effectiveness.engagementScore > 0.7) {
      recommendations.recommendationType = 'promote'
      recommendations.priority = 'medium'
      recommendations.reason = 'High performance content that could be featured more prominently'
      recommendations.suggestedActions = [
        'Use as template for similar content',
        'Increase visibility in learning paths',
        'Create variations for different difficulty levels',
      ]
      recommendations.expectedImpact = 0.6
      recommendations.confidence = 0.8
    } else if (effectiveness.dropOffRate > 0.4) {
      recommendations.recommendationType = 'improve'
      recommendations.priority = 'high'
      recommendations.reason = 'High abandonment rate indicates engagement issues'
      recommendations.suggestedActions = [
        'Add interactive elements to increase engagement',
        'Shorten content or break into smaller chunks',
        'Improve visual design and presentation',
      ]
      recommendations.expectedImpact = 0.7
      recommendations.confidence = 0.7
    } else if (effectiveness.avgResponseTime > 60000 && effectiveness.successRate < 0.6) {
      recommendations.recommendationType = 'improve'
      recommendations.priority = 'medium'
      recommendations.reason = 'Long response times suggest clarity issues'
      recommendations.suggestedActions = [
        'Simplify language and instructions',
        'Add visual aids or examples',
        'Provide better hints or guidance',
      ]
      recommendations.expectedImpact = 0.5
      recommendations.confidence = 0.6
    }

    return recommendations.recommendationType !== 'review' ? recommendations : null
  }

  private async updateItemPerformanceMetrics(
    itemId: string,
    interaction: UserInteractionEvent,
  ): Promise<void> {
    // Update item-level statistics using raw SQL for complex calculations
    if (interaction.eventType === 'attempt') {
      const updateQuery = sql`
        UPDATE items 
        SET 
          total_attempts = total_attempts + 1,
          correct_attempts = correct_attempts + ${interaction.isCorrect === true ? 1 : 0},
          success_rate = (correct_attempts + ${interaction.isCorrect === true ? 1 : 0})::float / GREATEST(total_attempts + 1, 1),
          avg_response_time = CASE 
            WHEN ${typeof interaction.responseTime === 'number' && interaction.responseTime > 0 ? interaction.responseTime : 0} > 0 
            THEN (avg_response_time * total_attempts + ${interaction.responseTime ?? 0}) / (total_attempts + 1)
            ELSE avg_response_time
          END,
          engagement_score = CASE 
            WHEN ${typeof interaction.engagementScore === 'number' && interaction.engagementScore > 0 ? interaction.engagementScore : 0} > 0 
            THEN (engagement_score * total_attempts + ${interaction.engagementScore ?? 0}) / (total_attempts + 1)
            ELSE engagement_score
          END
        WHERE id = ${itemId}
      `

      await db.execute(updateQuery)
    }
  }

  private async updateConceptAnalytics(
    conceptId: string,
    interaction: UserInteractionEvent,
  ): Promise<void> {
    const period = 'daily'
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)

    await db
      .insert(contentAnalytics)
      .values({
        entityType: 'concept',
        entityId: conceptId,
        period,
        periodStart,
        periodEnd,
        totalViews: interaction.eventType === 'view' ? 1 : 0,
        totalAttempts: interaction.eventType === 'attempt' ? 1 : 0,
        successfulAttempts: interaction.isCorrect === true ? 1 : 0,
        avgResponseTime: interaction.responseTime ?? 0,
        engagementScore: interaction.engagementScore ?? 0.5,
      })
      .onConflictDoUpdate({
        target: [
          contentAnalytics.entityType,
          contentAnalytics.entityId,
          contentAnalytics.period,
          contentAnalytics.periodStart,
        ],
        set: {
          totalViews: sql`${contentAnalytics.totalViews} + ${interaction.eventType === 'view' ? 1 : 0}`,
          totalAttempts: sql`${contentAnalytics.totalAttempts} + ${interaction.eventType === 'attempt' ? 1 : 0}`,
          successfulAttempts: sql`${contentAnalytics.successfulAttempts} + ${interaction.isCorrect === true ? 1 : 0}`,
        },
      })
  }
}
