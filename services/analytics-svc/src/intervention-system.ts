import { PrismaClient } from '@prisma/client'
import { createRedisClient } from '@drivemaster/redis-client'
import { randomUUID } from 'crypto'
import { PredictionResult, InterventionTrigger, BehaviorPattern } from './predictive-analytics'

export interface InterventionConfig {
  redisUrl: string
  interventionCooldownMs: number
  maxInterventionsPerDay: number
  escalationThresholds: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export interface InterventionAction {
  actionId: string
  actionType:
    | 'notification'
    | 'content_adjustment'
    | 'social_engagement'
    | 'instructor_alert'
    | 'adaptive_scheduling'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  targetUserId: string
  parameters: Record<string, any>
  scheduledFor: Date
  expiresAt: Date
  status: 'pending' | 'executed' | 'failed' | 'cancelled'
  createdAt: Date
}

export interface InterventionOutcome {
  outcomeId: string
  interventionId: string
  userId: string
  measurementType: 'engagement_change' | 'performance_change' | 'retention_change'
  beforeValue: number
  afterValue: number
  improvement: number
  measurementDate: Date
  followUpRequired: boolean
}

export class InterventionSystem {
  private prisma: PrismaClient
  private redis: any
  private config: InterventionConfig

  constructor(prisma: PrismaClient, config: InterventionConfig) {
    this.prisma = prisma
    this.config = config

    try {
      this.redis = createRedisClient(config.redisUrl)
    } catch (error) {
      console.warn('Redis client initialization failed:', error)
      this.redis = null
    }
  }

  // Main intervention trigger method
  async processInterventionTrigger(
    predictionResult: PredictionResult,
    behaviorPatterns: BehaviorPattern[],
  ): Promise<InterventionAction[]> {
    const userId = predictionResult.userId

    // Check if user is in cooldown period
    if (await this.isUserInCooldown(userId)) {
      console.log(`User ${userId} is in intervention cooldown period`)
      return []
    }

    // Check daily intervention limit
    if (await this.hasExceededDailyLimit(userId)) {
      console.log(`User ${userId} has exceeded daily intervention limit`)
      return []
    }

    // Create intervention trigger record
    const trigger = await this.createInterventionTrigger(predictionResult, behaviorPatterns)

    // Generate appropriate interventions based on risk type and severity
    const actions = await this.generateInterventionActions(trigger, behaviorPatterns)

    // Schedule and execute interventions
    const scheduledActions: InterventionAction[] = []
    for (const action of actions) {
      const scheduledAction = await this.scheduleIntervention(action)
      scheduledActions.push(scheduledAction)
    }

    // Update user intervention history
    await this.updateInterventionHistory(userId, trigger, scheduledActions)

    return scheduledActions
  }

  // Generate specific intervention actions based on risk assessment
  private async generateInterventionActions(
    trigger: InterventionTrigger,
    patterns: BehaviorPattern[],
  ): Promise<Partial<InterventionAction>[]> {
    const actions: Partial<InterventionAction>[] = []
    const userId = trigger.userId

    switch (trigger.triggerType) {
      case 'dropout_risk':
        actions.push(...(await this.generateDropoutInterventions(trigger, patterns)))
        break

      case 'engagement_decline':
        actions.push(...(await this.generateEngagementInterventions(trigger, patterns)))
        break

      case 'performance_drop':
        actions.push(...(await this.generatePerformanceInterventions(trigger, patterns)))
        break

      case 'learning_plateau':
        actions.push(...(await this.generatePlateauInterventions(trigger, patterns)))
        break
    }

    // Add escalation actions for high-risk cases
    if (trigger.severity === 'HIGH' || trigger.severity === 'CRITICAL') {
      actions.push(...(await this.generateEscalationActions(trigger)))
    }

    return actions
  }

  // Dropout prevention interventions
  private async generateDropoutInterventions(
    trigger: InterventionTrigger,
    patterns: BehaviorPattern[],
  ): Promise<Partial<InterventionAction>[]> {
    const actions: Partial<InterventionAction>[] = []
    const userId = trigger.userId

    // Immediate engagement boost
    actions.push({
      actionType: 'notification',
      priority: 'high',
      targetUserId: userId,
      parameters: {
        type: 'motivational_message',
        title: 'We miss you!',
        message: "Your learning journey is important. Let's get back on track together!",
        includeProgress: true,
        includeAchievements: true,
      },
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })

    // Content difficulty adjustment
    actions.push({
      actionType: 'content_adjustment',
      priority: 'medium',
      targetUserId: userId,
      parameters: {
        adjustmentType: 'reduce_difficulty',
        percentage: 20,
        duration: '7_days',
        reason: 'dropout_prevention',
      },
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })

    // Social re-engagement
    if (patterns.some((p) => p.pattern.name.includes('social'))) {
      actions.push({
        actionType: 'social_engagement',
        priority: 'medium',
        targetUserId: userId,
        parameters: {
          type: 'friend_challenge',
          challengeType: 'collaborative_learning',
          duration: '3_days',
        },
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours delay
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      })
    }

    // Instructor notification for critical cases
    if (trigger.severity === 'CRITICAL') {
      actions.push({
        actionType: 'instructor_alert',
        priority: 'urgent',
        targetUserId: userId,
        parameters: {
          alertType: 'high_dropout_risk',
          riskScore: trigger.riskScore,
          recommendedActions: trigger.recommendedActions,
          urgentResponse: true,
        },
        scheduledFor: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      })
    }

    return actions
  }

  // Engagement decline interventions
  private async generateEngagementInterventions(
    trigger: InterventionTrigger,
    patterns: BehaviorPattern[],
  ): Promise<Partial<InterventionAction>[]> {
    const actions: Partial<InterventionAction>[] = []
    const userId = trigger.userId

    // Gamification boost
    actions.push({
      actionType: 'notification',
      priority: 'medium',
      targetUserId: userId,
      parameters: {
        type: 'gamification_boost',
        title: 'Special Challenge Available!',
        message: "Complete today's challenge for bonus XP and exclusive badges!",
        bonusXP: 200,
        specialBadge: 'comeback_champion',
      },
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
    })

    // Adaptive scheduling adjustment
    const learningStylePattern = patterns.find((p) => p.patternType === 'learning_style')
    if (learningStylePattern) {
      actions.push({
        actionType: 'adaptive_scheduling',
        priority: 'medium',
        targetUserId: userId,
        parameters: {
          adjustmentType: 'optimize_timing',
          preferredTime: learningStylePattern.pattern.characteristics.includes('morning')
            ? 'morning'
            : 'evening',
          sessionDuration: learningStylePattern.pattern.characteristics.includes('intensive')
            ? 45
            : 20,
          frequency: 'daily',
        },
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000), // 1 hour delay
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      })
    }

    return actions
  }

  // Performance improvement interventions
  private async generatePerformanceInterventions(
    trigger: InterventionTrigger,
    patterns: BehaviorPattern[],
  ): Promise<Partial<InterventionAction>[]> {
    const actions: Partial<InterventionAction>[] = []
    const userId = trigger.userId

    // Provide additional learning resources
    actions.push({
      actionType: 'content_adjustment',
      priority: 'high',
      targetUserId: userId,
      parameters: {
        adjustmentType: 'add_support_content',
        contentTypes: ['explanatory_videos', 'practice_questions', 'concept_summaries'],
        focusAreas: trigger.recommendedActions,
        duration: '14_days',
      },
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    })

    // Encourage help-seeking behavior
    actions.push({
      actionType: 'notification',
      priority: 'medium',
      targetUserId: userId,
      parameters: {
        type: 'help_encouragement',
        title: 'Need some help?',
        message: 'Our AI tutor is here to help you understand difficult concepts better!',
        includeHelpButton: true,
        tutorAvailable: true,
      },
      scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes delay
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })

    return actions
  }

  // Learning plateau interventions
  private async generatePlateauInterventions(
    trigger: InterventionTrigger,
    patterns: BehaviorPattern[],
  ): Promise<Partial<InterventionAction>[]> {
    const actions: Partial<InterventionAction>[] = []
    const userId = trigger.userId

    // Introduce variety and challenge
    actions.push({
      actionType: 'content_adjustment',
      priority: 'medium',
      targetUserId: userId,
      parameters: {
        adjustmentType: 'increase_variety',
        newContentTypes: ['scenario_based', 'interactive_simulations', 'peer_challenges'],
        difficultyIncrease: 15,
        duration: '10_days',
      },
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
    })

    return actions
  }

  // Escalation actions for high-risk situations
  private async generateEscalationActions(
    trigger: InterventionTrigger,
  ): Promise<Partial<InterventionAction>[]> {
    const actions: Partial<InterventionAction>[] = []
    const userId = trigger.userId

    // Immediate instructor notification
    actions.push({
      actionType: 'instructor_alert',
      priority: 'urgent',
      targetUserId: userId,
      parameters: {
        alertType: 'urgent_intervention_needed',
        triggerType: trigger.triggerType,
        severity: trigger.severity,
        riskScore: trigger.riskScore,
        predictedOutcome: trigger.predictedOutcome,
        recommendedActions: trigger.recommendedActions,
        requiresImmediateAction: true,
      },
      scheduledFor: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })

    return actions
  }

  // Schedule and store intervention action
  private async scheduleIntervention(
    action: Partial<InterventionAction>,
  ): Promise<InterventionAction> {
    const fullAction: InterventionAction = {
      actionId: randomUUID(),
      status: 'pending',
      createdAt: new Date(),
      ...action,
    } as InterventionAction

    // Store in database
    await this.prisma.interventionAction.create({
      data: {
        actionId: fullAction.actionId,
        actionType: fullAction.actionType,
        priority: fullAction.priority,
        targetUserId: fullAction.targetUserId,
        parameters: fullAction.parameters,
        scheduledFor: fullAction.scheduledFor,
        expiresAt: fullAction.expiresAt,
        status: fullAction.status,
      },
    })

    // Schedule execution
    await this.scheduleActionExecution(fullAction)

    return fullAction
  }

  // Execute intervention action
  async executeIntervention(actionId: string): Promise<boolean> {
    try {
      const action = await this.prisma.interventionAction.findUnique({
        where: { actionId },
      })

      if (!action || action.status !== 'pending') {
        return false
      }

      // Check if action has expired
      if (new Date() > action.expiresAt) {
        await this.prisma.interventionAction.update({
          where: { actionId },
          data: { status: 'cancelled' },
        })
        return false
      }

      let success = false

      switch (action.actionType) {
        case 'notification':
          success = await this.executeNotificationAction(action)
          break
        case 'content_adjustment':
          success = await this.executeContentAdjustmentAction(action)
          break
        case 'social_engagement':
          success = await this.executeSocialEngagementAction(action)
          break
        case 'instructor_alert':
          success = await this.executeInstructorAlertAction(action)
          break
        case 'adaptive_scheduling':
          success = await this.executeAdaptiveSchedulingAction(action)
          break
      }

      // Update action status
      await this.prisma.interventionAction.update({
        where: { actionId },
        data: {
          status: success ? 'executed' : 'failed',
          executedAt: new Date(),
        },
      })

      return success
    } catch (error) {
      console.error(`Failed to execute intervention ${actionId}:`, error)

      await this.prisma.interventionAction.update({
        where: { actionId },
        data: { status: 'failed' },
      })

      return false
    }
  }

  // Measure intervention effectiveness
  async measureInterventionOutcome(
    interventionId: string,
    measurementType: 'engagement_change' | 'performance_change' | 'retention_change',
    beforeValue: number,
    afterValue: number,
  ): Promise<InterventionOutcome> {
    const improvement = afterValue - beforeValue
    const improvementPercentage = beforeValue > 0 ? (improvement / beforeValue) * 100 : 0

    const outcome: InterventionOutcome = {
      outcomeId: randomUUID(),
      interventionId,
      userId: '', // Would be retrieved from intervention record
      measurementType,
      beforeValue,
      afterValue,
      improvement: improvementPercentage,
      measurementDate: new Date(),
      followUpRequired: Math.abs(improvementPercentage) < 5, // Less than 5% improvement
    }

    // Store outcome
    await this.prisma.interventionOutcome.create({
      data: outcome,
    })

    // Update intervention effectiveness metrics
    await this.updateInterventionMetrics(interventionId, outcome)

    return outcome
  }

  // Helper methods for checking constraints
  private async isUserInCooldown(userId: string): Promise<boolean> {
    if (!this.redis) return false

    const cooldownKey = `intervention_cooldown:${userId}`
    const lastIntervention = await this.redis.get(cooldownKey)

    if (!lastIntervention) return false

    const lastTime = parseInt(lastIntervention)
    const cooldownPeriod = this.config.interventionCooldownMs

    return Date.now() - lastTime < cooldownPeriod
  }

  private async hasExceededDailyLimit(userId: string): Promise<boolean> {
    if (!this.redis) return false

    const today = new Date().toISOString().split('T')[0]
    const dailyKey = `interventions_today:${userId}:${today}`
    const count = (await this.redis.get(dailyKey)) || 0

    return parseInt(count) >= this.config.maxInterventionsPerDay
  }

  private async createInterventionTrigger(
    predictionResult: PredictionResult,
    patterns: BehaviorPattern[],
  ): Promise<InterventionTrigger> {
    const trigger: InterventionTrigger = {
      triggerId: randomUUID(),
      userId: predictionResult.userId,
      triggerType: this.determineTriggerType(predictionResult),
      severity: this.determineSeverity(predictionResult.prediction),
      riskScore: predictionResult.prediction,
      predictedOutcome: this.generatePredictedOutcome(predictionResult),
      recommendedActions: this.generateRecommendedActions(predictionResult, patterns),
      urgency: this.calculateUrgency(predictionResult.prediction),
      createdAt: new Date(),
    }

    // Store trigger
    await this.prisma.interventionTrigger.create({
      data: trigger,
    })

    return trigger
  }

  // Placeholder execution methods - would integrate with actual services
  private async executeNotificationAction(action: any): Promise<boolean> {
    console.log(`Executing notification action for user ${action.targetUserId}`)
    // Would integrate with notification service
    return true
  }

  private async executeContentAdjustmentAction(action: any): Promise<boolean> {
    console.log(`Executing content adjustment for user ${action.targetUserId}`)
    // Would integrate with content service
    return true
  }

  private async executeSocialEngagementAction(action: any): Promise<boolean> {
    console.log(`Executing social engagement action for user ${action.targetUserId}`)
    // Would integrate with engagement service
    return true
  }

  private async executeInstructorAlertAction(action: any): Promise<boolean> {
    console.log(`Sending instructor alert for user ${action.targetUserId}`)
    // Would integrate with instructor notification system
    return true
  }

  private async executeAdaptiveSchedulingAction(action: any): Promise<boolean> {
    console.log(`Adjusting schedule for user ${action.targetUserId}`)
    // Would integrate with adaptive learning service
    return true
  }

  // Helper methods
  private determineTriggerType(result: PredictionResult): InterventionTrigger['triggerType'] {
    if (result.modelName === 'dropout_prediction') return 'dropout_risk'
    if (result.explanation.some((e) => e.includes('engagement'))) return 'engagement_decline'
    if (result.explanation.some((e) => e.includes('performance'))) return 'performance_drop'
    return 'learning_plateau'
  }

  private determineSeverity(riskScore: number): InterventionTrigger['severity'] {
    if (riskScore >= this.config.escalationThresholds.critical) return 'CRITICAL'
    if (riskScore >= this.config.escalationThresholds.high) return 'HIGH'
    if (riskScore >= this.config.escalationThresholds.medium) return 'MEDIUM'
    return 'LOW'
  }

  private generatePredictedOutcome(result: PredictionResult): string {
    const risk = result.prediction
    if (risk > 0.8) return 'High likelihood of dropout within 7 days'
    if (risk > 0.6) return 'Moderate risk of disengagement within 14 days'
    if (risk > 0.4) return 'Declining performance trend detected'
    return 'Minor engagement concerns'
  }

  private generateRecommendedActions(
    result: PredictionResult,
    patterns: BehaviorPattern[],
  ): string[] {
    const actions = [...result.explanation]

    patterns.forEach((pattern) => {
      actions.push(...pattern.pattern.recommendations)
    })

    return [...new Set(actions)] // Remove duplicates
  }

  private calculateUrgency(riskScore: number): number {
    return Math.min(10, Math.floor(riskScore * 10))
  }

  private async scheduleActionExecution(action: InterventionAction): Promise<void> {
    // Would integrate with job scheduler (e.g., Bull Queue, Agenda)
    console.log(`Scheduled action ${action.actionId} for ${action.scheduledFor}`)
  }

  private async updateInterventionHistory(
    userId: string,
    trigger: InterventionTrigger,
    actions: InterventionAction[],
  ): Promise<void> {
    if (!this.redis) return

    const today = new Date().toISOString().split('T')[0]
    const dailyKey = `interventions_today:${userId}:${today}`
    const cooldownKey = `intervention_cooldown:${userId}`

    await this.redis.incr(dailyKey)
    await this.redis.expire(dailyKey, 86400) // 24 hours
    await this.redis.set(cooldownKey, Date.now())
    await this.redis.expire(cooldownKey, Math.floor(this.config.interventionCooldownMs / 1000))
  }

  private async updateInterventionMetrics(
    interventionId: string,
    outcome: InterventionOutcome,
  ): Promise<void> {
    // Update effectiveness metrics for ML model improvement
    console.log(
      `Updated metrics for intervention ${interventionId}: ${outcome.improvement}% improvement`,
    )
  }
}
