import { eq, and, sql, gte, lte } from 'drizzle-orm'
import { db, abTests, items } from '../db/connection.js'

export interface CreateABTestRequest {
  name: string
  description?: string
  hypothesis: string
  variants: {
    [key: string]: {
      name: string
      description?: string
      trafficPercentage: number
      changes: any // What changes to apply
    }
  }
  targetConcepts?: string[]
  targetUsers?: string[]
  startDate?: Date
  endDate?: Date
}

export interface ABTestResult {
  variant: string
  metrics: {
    impressions: number
    conversions: number
    conversionRate: number
    avgResponseTime: number
    successRate: number
    engagementScore: number
  }
}

export interface ABTestAnalysis {
  testId: string
  status: string
  results: ABTestResult[]
  winner?: string
  confidence?: number
  statisticalSignificance: boolean
  recommendations: string[]
}

export class ABTestingService {
  async createTest(data: CreateABTestRequest, createdBy?: string) {
    // Validate traffic split adds up to 100%
    const totalTraffic = Object.values(data.variants).reduce(
      (sum, variant) => sum + variant.trafficPercentage,
      0,
    )

    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Traffic split must add up to 100%')
    }

    const [test] = await db
      .insert(abTests)
      .values({
        name: data.name,
        description: data.description,
        hypothesis: data.hypothesis,
        variants: data.variants,
        trafficSplit: this.calculateTrafficSplit(data.variants),
        targetConcepts: data.targetConcepts || [],
        targetUsers: data.targetUsers || [],
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy,
      })
      .returning()

    return test
  }

  async startTest(testId: string) {
    const [test] = await db
      .update(abTests)
      .set({
        status: 'RUNNING',
        startDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(abTests.id, testId))
      .returning()

    if (!test) {
      throw new Error('Test not found')
    }

    return test
  }

  async pauseTest(testId: string) {
    const [test] = await db
      .update(abTests)
      .set({
        status: 'PAUSED',
        updatedAt: new Date(),
      })
      .where(eq(abTests.id, testId))
      .returning()

    if (!test) {
      throw new Error('Test not found')
    }

    return test
  }

  async completeTest(testId: string, winner?: string) {
    const analysis = await this.analyzeTest(testId)

    const [test] = await db
      .update(abTests)
      .set({
        status: 'COMPLETED',
        endDate: new Date(),
        winner: winner || analysis.winner,
        confidence: analysis.confidence,
        results: analysis.results,
        updatedAt: new Date(),
      })
      .where(eq(abTests.id, testId))
      .returning()

    if (!test) {
      throw new Error('Test not found')
    }

    return test
  }

  async assignVariant(testId: string, userId: string, conceptId?: string): Promise<string> {
    const test = await db.query.abTests.findFirst({
      where: eq(abTests.id, testId),
    })

    if (!test || test.status !== 'RUNNING') {
      throw new Error('Test not found or not running')
    }

    // Check if test is targeted
    if (test.targetUsers.length > 0 && !test.targetUsers.includes(userId)) {
      return 'control' // Default to control for non-targeted users
    }

    if (test.targetConcepts.length > 0 && conceptId && !test.targetConcepts.includes(conceptId)) {
      return 'control' // Default to control for non-targeted concepts
    }

    // Use deterministic assignment based on user ID and test ID
    const hash = this.hashString(`${userId}_${testId}`)
    const percentage = hash % 100

    // Assign variant based on traffic split
    const trafficSplit = test.trafficSplit as { [key: string]: number }
    let cumulativePercentage = 0

    for (const [variant, allocation] of Object.entries(trafficSplit)) {
      cumulativePercentage += allocation
      if (percentage < cumulativePercentage) {
        return variant
      }
    }

    return 'control' // Fallback
  }

  async trackConversion(
    testId: string,
    userId: string,
    variant: string,
    outcome: {
      isSuccess: boolean
      responseTime?: number
      engagementScore?: number
      metadata?: any
    },
  ) {
    // This would typically be stored in a separate events table
    // For now, we'll update the test results directly
    const test = await db.query.abTests.findFirst({
      where: eq(abTests.id, testId),
    })

    if (!test) {
      throw new Error('Test not found')
    }

    // Update test results (simplified - in production, use proper event tracking)
    const currentResults = (test.results as any) || {}
    if (!currentResults[variant]) {
      currentResults[variant] = {
        impressions: 0,
        conversions: 0,
        totalResponseTime: 0,
        totalEngagement: 0,
      }
    }

    currentResults[variant].impressions += 1
    if (outcome.isSuccess) {
      currentResults[variant].conversions += 1
    }
    if (outcome.responseTime) {
      currentResults[variant].totalResponseTime += outcome.responseTime
    }
    if (outcome.engagementScore) {
      currentResults[variant].totalEngagement += outcome.engagementScore
    }

    await db
      .update(abTests)
      .set({
        results: currentResults,
        updatedAt: new Date(),
      })
      .where(eq(abTests.id, testId))
  }

  async analyzeTest(testId: string): Promise<ABTestAnalysis> {
    const test = await db.query.abTests.findFirst({
      where: eq(abTests.id, testId),
    })

    if (!test) {
      throw new Error('Test not found')
    }

    const rawResults = (test.results as any) || {}
    const results: ABTestResult[] = []

    // Calculate metrics for each variant
    for (const [variant, data] of Object.entries(rawResults)) {
      const variantData = data as any
      const impressions = variantData.impressions || 0
      const conversions = variantData.conversions || 0
      const conversionRate = impressions > 0 ? conversions / impressions : 0
      const avgResponseTime = impressions > 0 ? variantData.totalResponseTime / impressions : 0
      const avgEngagement = impressions > 0 ? variantData.totalEngagement / impressions : 0

      results.push({
        variant,
        metrics: {
          impressions,
          conversions,
          conversionRate,
          avgResponseTime,
          successRate: conversionRate,
          engagementScore: avgEngagement,
        },
      })
    }

    // Determine winner and statistical significance
    const { winner, confidence, isSignificant } = this.calculateStatisticalSignificance(results)

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, winner, isSignificant)

    return {
      testId,
      status: test.status,
      results,
      winner,
      confidence,
      statisticalSignificance: isSignificant,
      recommendations,
    }
  }

  async getActiveTests(conceptId?: string) {
    let whereConditions = [eq(abTests.status, 'RUNNING')]

    if (conceptId) {
      whereConditions.push(
        sql`${abTests.targetConcepts}::jsonb ? ${conceptId} OR array_length(${abTests.targetConcepts}, 1) IS NULL`,
      )
    }

    return await db.query.abTests.findMany({
      where: and(...whereConditions),
      orderBy: [abTests.startDate],
    })
  }

  async getTestResults(testId: string) {
    return await this.analyzeTest(testId)
  }

  // Private helper methods
  private calculateTrafficSplit(variants: any): { [key: string]: number } {
    const split: { [key: string]: number } = {}

    for (const [key, variant] of Object.entries(variants)) {
      split[key] = (variant as any).trafficPercentage
    }

    return split
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private calculateStatisticalSignificance(results: ABTestResult[]): {
    winner?: string
    confidence?: number
    isSignificant: boolean
  } {
    if (results.length < 2) {
      return { isSignificant: false }
    }

    // Sort by conversion rate
    const sortedResults = [...results].sort(
      (a, b) => b.metrics.conversionRate - a.metrics.conversionRate,
    )

    const best = sortedResults[0]
    const second = sortedResults[1]

    // Simple z-test for proportions (simplified)
    const n1 = best.metrics.impressions
    const n2 = second.metrics.impressions
    const p1 = best.metrics.conversionRate
    const p2 = second.metrics.conversionRate

    if (n1 < 30 || n2 < 30) {
      return { isSignificant: false } // Need more data
    }

    const pooledP = (best.metrics.conversions + second.metrics.conversions) / (n1 + n2)
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2))
    const zScore = Math.abs(p1 - p2) / se

    // 95% confidence level (z = 1.96)
    const isSignificant = zScore > 1.96
    const confidence = this.zScoreToConfidence(zScore)

    return {
      winner: isSignificant ? best.variant : undefined,
      confidence,
      isSignificant,
    }
  }

  private zScoreToConfidence(zScore: number): number {
    // Approximate conversion from z-score to confidence percentage
    if (zScore >= 2.58) return 99
    if (zScore >= 1.96) return 95
    if (zScore >= 1.65) return 90
    if (zScore >= 1.28) return 80
    return Math.round(50 + (zScore / 3.29) * 40) // Rough approximation
  }

  private generateRecommendations(
    results: ABTestResult[],
    winner?: string,
    isSignificant?: boolean,
  ): string[] {
    const recommendations: string[] = []

    if (!isSignificant) {
      recommendations.push('Test needs more data to reach statistical significance')
      recommendations.push('Consider running the test longer or increasing traffic allocation')
    } else if (winner) {
      recommendations.push(`Implement variant "${winner}" as it shows significant improvement`)

      const winnerResult = results.find((r) => r.variant === winner)
      if (winnerResult) {
        const improvement = Math.round(
          (winnerResult.metrics.conversionRate -
            Math.min(...results.map((r) => r.metrics.conversionRate))) *
            100,
        )
        recommendations.push(`Expected improvement: ${improvement}% increase in conversion rate`)
      }
    }

    // Check for low engagement variants
    const lowEngagementVariants = results.filter((r) => r.metrics.engagementScore < 0.3)
    if (lowEngagementVariants.length > 0) {
      recommendations.push('Some variants show low engagement - consider redesigning them')
    }

    // Check for high response time variants
    const slowVariants = results.filter((r) => r.metrics.avgResponseTime > 5000) // 5 seconds
    if (slowVariants.length > 0) {
      recommendations.push('Some variants have high response times - optimize for performance')
    }

    return recommendations
  }
}
