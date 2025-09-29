import {
  MultiArmedBandit,
  type BanditArm,
  type BanditArmStats,
  type ContextualFeatures,
  type BanditConfig,
} from '../algorithms/mab.js'
import type {
  MABServiceInterface,
  Question,
  LearningContext,
  QuestionSelection,
  LearningOutcome,
  DynamicDifficultyAdjustment,
  FatigueDetection,
  SessionOptimization,
  BanditPerformanceMetrics,
  MABConfig,
  ThompsonSamplingResult,
  ContextualBanditFeatures,
  MABAnalytics,
} from '../types/mab.types.js'

export class MABService implements MABServiceInterface {
  private config: MABConfig
  private userBanditStats: Map<string, Map<string, BanditArmStats>> = new Map()
  private userPerformanceHistory: Map<string, LearningOutcome[]> = new Map()
  private userSessionData: Map<string, Map<string, LearningOutcome[]>> = new Map()
  private difficultyAdjustments: Map<string, DynamicDifficultyAdjustment> = new Map()

  constructor(config: MABConfig) {
    this.config = config
  }

  /**
   * Select optimal question using Thompson Sampling with contextual features
   */
  async selectOptimalQuestion(
    userId: string,
    availableQuestions: Question[],
    context: LearningContext,
  ): Promise<QuestionSelection> {
    if (availableQuestions.length === 0) {
      throw new Error('No available questions provided')
    }

    // Get user's bandit statistics
    const userStats = this.getUserBanditStats(userId)

    // Create contextual features
    const contextualFeatures: ContextualFeatures = {
      userMastery: context.userMastery,
      timeOfDay: context.timeOfDay,
      sessionGoal: context.sessionGoals.join(','),
      fatigueLevel: context.fatigueLevel,
      previousPerformance: context.previousPerformance,
      conceptDifficulty: this.calculateAverageConceptDifficulty(availableQuestions),
      studyStreak: context.studyStreak,
    }

    // Create bandit configuration
    const banditConfig: BanditConfig = {
      explorationRate: this.config.explorationRate,
      zpdMinSuccess: this.config.zpdMinSuccess,
      zpdMaxSuccess: this.config.zpdMaxSuccess,
      engagementWeight: this.config.engagementWeight,
      difficultyWeight: this.config.difficultyWeight,
      freshnessWeight: this.config.freshnessWeight,
    }

    // Apply dynamic difficulty adjustment if needed
    const difficultyAdjustment = await this.getDifficultyAdjustment(userId)
    let filteredQuestions = availableQuestions
    if (difficultyAdjustment) {
      // Adjust available questions based on difficulty recommendation
      const adjustedQuestions = this.applyDifficultyFilter(availableQuestions, difficultyAdjustment)
      if (adjustedQuestions.length > 0) {
        filteredQuestions = adjustedQuestions
      }
    }

    // Convert filtered questions to bandit arms
    const arms: BanditArm[] = filteredQuestions.map((q) => ({
      id: q.id,
      conceptKey: q.conceptId,
      difficulty: q.difficulty,
      discrimination: q.discrimination,
      engagement: this.calculateEngagementScore(q),
    }))

    // Select arm using Thompson Sampling
    const selection = MultiArmedBandit.selectArm(arms, userStats, contextualFeatures, banditConfig)

    // Find the corresponding question
    const selectedQuestion = filteredQuestions.find((q) => q.id === selection.selectedArm.id)
    if (!selectedQuestion) {
      throw new Error('Selected question not found in available questions')
    }

    // Calculate contextual factors for transparency
    const contextualFactors = {
      difficultyMatch: MultiArmedBandit.calculateDifficultyMatch(
        selection.selectedArm.difficulty,
        context.userMastery,
      ),
      zpdReward: MultiArmedBandit.calculateZPDReward(
        MultiArmedBandit.calculateDifficultyMatch(
          selection.selectedArm.difficulty,
          context.userMastery,
        ),
        banditConfig.zpdMinSuccess,
        banditConfig.zpdMaxSuccess,
      ),
      engagementReward: (selection.selectedArm.engagement || 0.5) * banditConfig.engagementWeight,
      progressionReward:
        MultiArmedBandit.calculateProgressionReward(
          selection.selectedArm.difficulty,
          context.userMastery,
          context.previousPerformance,
        ) * banditConfig.difficultyWeight,
      fatigueAdjustment: context.fatigueLevel > 0.7 ? 0.8 : 1.0,
      goalAlignment: MultiArmedBandit.calculateGoalAlignment(
        selection.selectedArm,
        contextualFeatures.sessionGoal,
      ),
      timeAdjustment: MultiArmedBandit.calculateTimeAdjustment(context.timeOfDay),
    }

    return {
      question: selectedQuestion,
      expectedReward: selection.expectedReward,
      sampledValue: selection.sampledValue,
      selectionReason: this.generateSelectionReason(selection, contextualFactors),
      contextualFactors,
    }
  }

  /**
   * Update reward model based on learning outcome
   */
  async updateRewardModel(
    userId: string,
    questionId: string,
    outcome: LearningOutcome,
  ): Promise<void> {
    const userStats = this.getUserBanditStats(userId)

    // Calculate reward based on multiple factors
    const reward = this.calculateReward(outcome)

    // Update bandit statistics
    MultiArmedBandit.updateArmStats(questionId, reward, userStats)

    // Store performance history
    this.addToPerformanceHistory(userId, outcome)

    // Update session data
    this.addToSessionData(userId, outcome.sessionId, outcome)

    // Check for concept drift
    if (await this.detectConceptDrift(userId)) {
      await this.handleConceptDrift(userId)
    }

    // Update difficulty adjustment if needed
    await this.updateDifficultyAdjustment(userId, outcome)
  }

  /**
   * Adjust difficulty dynamically to maintain optimal success rate
   */
  async adjustDifficulty(
    userId: string,
    currentPerformance: number[],
  ): Promise<DynamicDifficultyAdjustment> {
    if (currentPerformance.length < this.config.minQuestionsForStats) {
      // Not enough data for adjustment
      return this.createDefaultDifficultyAdjustment(userId)
    }

    const currentSuccessRate =
      currentPerformance.filter((p) => p > 0.5).length / currentPerformance.length
    const targetSuccessRate = (this.config.zpdMinSuccess + this.config.zpdMaxSuccess) / 2

    let difficultyAdjustment = 0
    let adjustmentReason = 'No adjustment needed'

    if (currentSuccessRate < this.config.zpdMinSuccess) {
      // Too difficult - make easier
      difficultyAdjustment = -0.1 * (this.config.zpdMinSuccess - currentSuccessRate)
      adjustmentReason = 'Success rate too low - reducing difficulty'
    } else if (currentSuccessRate > this.config.zpdMaxSuccess) {
      // Too easy - make harder
      difficultyAdjustment = 0.1 * (currentSuccessRate - this.config.zpdMaxSuccess)
      adjustmentReason = 'Success rate too high - increasing difficulty'
    }

    // Calculate confidence interval using Wilson score interval
    const confidenceInterval = this.calculateWilsonConfidenceInterval(
      currentPerformance.filter((p) => p > 0.5).length,
      currentPerformance.length,
      0.95,
    )

    const adjustment: DynamicDifficultyAdjustment = {
      userId,
      currentSuccessRate,
      targetSuccessRate,
      difficultyAdjustment,
      adjustmentReason,
      confidenceInterval,
    }

    this.difficultyAdjustments.set(userId, adjustment)
    return adjustment
  }

  /**
   * Detect user fatigue based on performance patterns
   */
  async detectFatigue(userId: string, sessionData: LearningOutcome[]): Promise<FatigueDetection> {
    if (sessionData.length < 3) {
      return this.createNoFatigueDetection(userId)
    }

    // Analyze performance trends
    const recentOutcomes = sessionData.slice(-5) // Last 5 questions
    const earlierOutcomes = sessionData.slice(0, Math.max(1, sessionData.length - 5))

    // Calculate fatigue indicators
    const responseTimeIncrease = this.calculateResponseTimeIncrease(recentOutcomes, earlierOutcomes)
    const accuracyDecrease = this.calculateAccuracyDecrease(recentOutcomes, earlierOutcomes)
    const confidenceDecrease = this.calculateConfidenceDecrease(recentOutcomes, earlierOutcomes)
    const sessionDuration = this.calculateSessionDuration(sessionData)

    // Calculate overall fatigue level
    const fatigueLevel = this.calculateFatigueLevel({
      responseTimeIncrease,
      accuracyDecrease,
      confidenceDecrease,
      sessionDuration,
    })

    // Determine recommended action
    let recommendedAction: FatigueDetection['recommendedAction'] = 'continue'
    let estimatedRecoveryTime = 0

    if (fatigueLevel > 0.8) {
      recommendedAction = 'end_session'
      estimatedRecoveryTime = 60 // 1 hour
    } else if (fatigueLevel > 0.6) {
      recommendedAction = 'break'
      estimatedRecoveryTime = 15 // 15 minutes
    } else if (fatigueLevel > 0.4) {
      recommendedAction = 'easier_content'
      estimatedRecoveryTime = 5 // 5 minutes
    }

    return {
      userId,
      currentFatigueLevel: fatigueLevel,
      fatigueIndicators: {
        responseTimeIncrease,
        accuracyDecrease,
        confidenceDecrease,
        sessionDuration,
      },
      recommendedAction,
      estimatedRecoveryTime,
    }
  }

  /**
   * Optimize session parameters based on user performance
   */
  async optimizeSession(
    userId: string,
    sessionId: string,
    sessionData: LearningOutcome[],
  ): Promise<SessionOptimization> {
    if (!this.config.sessionOptimizationEnabled) {
      return this.createDefaultSessionOptimization(userId, sessionId)
    }

    const fatigueDetection = await this.detectFatigue(userId, sessionData)
    const performanceDecline = this.detectPerformanceDecline(sessionData)

    // Calculate optimal session length based on performance curve
    const optimalSessionLength = this.calculateOptimalSessionLength(sessionData)

    // Recommend break time based on fatigue level
    const recommendedBreakTime = Math.max(5, fatigueDetection.currentFatigueLevel * 30)

    // Suggest difficulty adjustment
    const recentPerformance = sessionData.slice(-10).map((outcome) => (outcome.isCorrect ? 1 : 0))
    const difficultyAdjustment = await this.adjustDifficulty(userId, recentPerformance)

    // Estimate next session time
    const nextSessionRecommendation = new Date(
      Date.now() + recommendedBreakTime * 60 * 1000 + 4 * 60 * 60 * 1000, // Break time + 4 hours
    )

    return {
      userId,
      sessionId,
      optimalSessionLength,
      recommendedBreakTime,
      fatigueThreshold: this.config.fatigueThreshold,
      performanceDeclineDetected: performanceDecline,
      suggestedDifficultyAdjustment: difficultyAdjustment.difficultyAdjustment,
      nextSessionRecommendation,
    }
  }

  /**
   * Get performance metrics for user or specific question
   */
  async getPerformanceMetrics(
    userId: string,
    questionId?: string,
  ): Promise<BanditPerformanceMetrics[]> {
    const userStats = this.getUserBanditStats(userId)
    const metrics: BanditPerformanceMetrics[] = []

    for (const [armId, stats] of userStats) {
      if (questionId && armId !== questionId) continue

      const recentPerformance = this.getRecentPerformance(userId, armId)
      const explorationRatio = this.calculateExplorationRatio(stats)

      metrics.push({
        armId,
        totalPulls: stats.totalPulls,
        totalRewards: stats.totalRewards,
        averageReward: stats.avgReward,
        successRate: stats.totalPulls > 0 ? stats.totalRewards / stats.totalPulls : 0,
        averageResponseTime: this.calculateAverageResponseTime(userId, armId),
        lastPulled: stats.lastPulled || new Date(),
        recentPerformance,
        explorationCount: Math.floor(stats.totalPulls * (1 - explorationRatio.exploitation)),
        exploitationCount: Math.floor(stats.totalPulls * explorationRatio.exploitation),
      })
    }

    return metrics
  }

  /**
   * Get exploration vs exploitation ratio for user
   */
  async getExplorationRatio(
    userId: string,
  ): Promise<{ exploration: number; exploitation: number }> {
    const userStats = this.getUserBanditStats(userId)
    return MultiArmedBandit.getExplorationRatio(userStats)
  }

  /**
   * Reset bandit statistics with optional decay
   */
  async resetBanditStats(userId: string, decayFactor: number = 0.5): Promise<void> {
    const userStats = this.getUserBanditStats(userId)
    MultiArmedBandit.resetBanditStats(userStats, decayFactor)
  }

  /**
   * Detect concept drift in user performance
   */
  async detectConceptDrift(userId: string): Promise<boolean> {
    const userStats = this.getUserBanditStats(userId)
    return MultiArmedBandit.detectConceptDrift(userStats, this.config.performanceWindowSize)
  }

  // Private helper methods

  private getUserBanditStats(userId: string): Map<string, BanditArmStats> {
    if (!this.userBanditStats.has(userId)) {
      this.userBanditStats.set(userId, new Map())
    }
    return this.userBanditStats.get(userId)!
  }

  private calculateEngagementScore(question: Question): number {
    // Simple engagement calculation based on question metadata
    const baseScore = 0.5
    const ratingBonus = (question.metadata.averageRating - 3) * 0.1 // Assuming 1-5 scale
    const reviewBonus = Math.min(0.2, question.metadata.reviewCount / 100)

    return Math.max(0.1, Math.min(1.0, baseScore + ratingBonus + reviewBonus))
  }

  private calculateAverageConceptDifficulty(questions: Question[]): number {
    return questions.reduce((sum, q) => sum + q.difficulty, 0) / questions.length
  }

  private async getDifficultyAdjustment(
    userId: string,
  ): Promise<DynamicDifficultyAdjustment | null> {
    return this.difficultyAdjustments.get(userId) || null
  }

  private applyDifficultyFilter(
    questions: Question[],
    adjustment: DynamicDifficultyAdjustment,
  ): Question[] {
    const targetDifficulty = 0.5 + adjustment.difficultyAdjustment
    const tolerance = 0.2

    return questions.filter(
      (q) =>
        q.difficulty >= targetDifficulty - tolerance &&
        q.difficulty <= targetDifficulty + tolerance,
    )
  }

  private generateSelectionReason(
    selection: { selectedArm: BanditArm; expectedReward: number; sampledValue: number },
    factors: any,
  ): string {
    const reasons: string[] = []

    if (factors.zpdReward > 0.8) {
      reasons.push('optimal difficulty for learning zone')
    }
    if (factors.engagementReward > 0.7) {
      reasons.push('high engagement potential')
    }
    if (factors.progressionReward > 0.7) {
      reasons.push('good for skill progression')
    }
    if (factors.fatigueAdjustment < 1.0) {
      reasons.push('adjusted for fatigue')
    }

    return reasons.length > 0 ? reasons.join(', ') : 'balanced selection'
  }

  private calculateReward(outcome: LearningOutcome): number {
    let reward = outcome.isCorrect ? 1.0 : 0.0

    // Adjust reward based on response time (faster = better)
    const expectedTime = 30000 // 30 seconds baseline
    const timeBonus = Math.max(0, (expectedTime - outcome.responseTime) / expectedTime) * 0.2
    reward += timeBonus

    // Adjust reward based on confidence
    if (outcome.confidence) {
      const confidenceBonus = (outcome.confidence - 3) * 0.1 // Assuming 1-5 scale
      reward += confidenceBonus
    }

    // Penalty for multiple attempts
    if (outcome.attempts > 1) {
      reward *= Math.pow(0.8, outcome.attempts - 1)
    }

    return Math.max(0, Math.min(1, reward))
  }

  private addToPerformanceHistory(userId: string, outcome: LearningOutcome): void {
    if (!this.userPerformanceHistory.has(userId)) {
      this.userPerformanceHistory.set(userId, [])
    }
    const history = this.userPerformanceHistory.get(userId)!
    history.push(outcome)

    // Keep only recent history
    if (history.length > this.config.performanceWindowSize) {
      history.splice(0, history.length - this.config.performanceWindowSize)
    }
  }

  private addToSessionData(userId: string, sessionId: string, outcome: LearningOutcome): void {
    if (!this.userSessionData.has(userId)) {
      this.userSessionData.set(userId, new Map())
    }
    const userSessions = this.userSessionData.get(userId)!

    if (!userSessions.has(sessionId)) {
      userSessions.set(sessionId, [])
    }
    userSessions.get(sessionId)!.push(outcome)
  }

  private async handleConceptDrift(userId: string): Promise<void> {
    // Reset with partial decay to adapt to new patterns
    await this.resetBanditStats(userId, 0.7)
  }

  private async updateDifficultyAdjustment(
    userId: string,
    outcome: LearningOutcome,
  ): Promise<void> {
    const history = this.userPerformanceHistory.get(userId) || []
    if (history.length >= this.config.minQuestionsForStats) {
      const recentPerformance = history.slice(-10).map((o) => (o.isCorrect ? 1 : 0))
      await this.adjustDifficulty(userId, recentPerformance)
    }
  }

  private createDefaultDifficultyAdjustment(userId: string): DynamicDifficultyAdjustment {
    return {
      userId,
      currentSuccessRate: 0.75,
      targetSuccessRate: 0.75,
      difficultyAdjustment: 0,
      adjustmentReason: 'Insufficient data for adjustment',
      confidenceInterval: { lower: 0.5, upper: 1.0 },
    }
  }

  private calculateWilsonConfidenceInterval(
    successes: number,
    trials: number,
    confidence: number,
  ): { lower: number; upper: number } {
    if (trials === 0) return { lower: 0, upper: 1 }

    const z = 1.96 // 95% confidence
    const p = successes / trials
    const denominator = 1 + (z * z) / trials
    const center = (p + (z * z) / (2 * trials)) / denominator
    const margin =
      (z / denominator) * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials))

    return {
      lower: Math.max(0, center - margin),
      upper: Math.min(1, center + margin),
    }
  }

  private createNoFatigueDetection(userId: string): FatigueDetection {
    return {
      userId,
      currentFatigueLevel: 0,
      fatigueIndicators: {
        responseTimeIncrease: 0,
        accuracyDecrease: 0,
        confidenceDecrease: 0,
        sessionDuration: 0,
      },
      recommendedAction: 'continue',
      estimatedRecoveryTime: 0,
    }
  }

  private calculateResponseTimeIncrease(
    recent: LearningOutcome[],
    earlier: LearningOutcome[],
  ): number {
    if (recent.length === 0 || earlier.length === 0) return 0

    const recentAvg = recent.reduce((sum, o) => sum + o.responseTime, 0) / recent.length
    const earlierAvg = earlier.reduce((sum, o) => sum + o.responseTime, 0) / earlier.length

    return Math.max(0, (recentAvg - earlierAvg) / earlierAvg)
  }

  private calculateAccuracyDecrease(recent: LearningOutcome[], earlier: LearningOutcome[]): number {
    if (recent.length === 0 || earlier.length === 0) return 0

    const recentAccuracy = recent.filter((o) => o.isCorrect).length / recent.length
    const earlierAccuracy = earlier.filter((o) => o.isCorrect).length / earlier.length

    return Math.max(0, earlierAccuracy - recentAccuracy)
  }

  private calculateConfidenceDecrease(
    recent: LearningOutcome[],
    earlier: LearningOutcome[],
  ): number {
    const recentWithConfidence = recent.filter((o) => o.confidence !== undefined)
    const earlierWithConfidence = earlier.filter((o) => o.confidence !== undefined)

    if (recentWithConfidence.length === 0 || earlierWithConfidence.length === 0) return 0

    const recentAvg =
      recentWithConfidence.reduce((sum, o) => sum + (o.confidence || 0), 0) /
      recentWithConfidence.length
    const earlierAvg =
      earlierWithConfidence.reduce((sum, o) => sum + (o.confidence || 0), 0) /
      earlierWithConfidence.length

    return Math.max(0, earlierAvg - recentAvg)
  }

  private calculateSessionDuration(sessionData: LearningOutcome[]): number {
    if (sessionData.length === 0) return 0

    const start = Math.min(...sessionData.map((o) => o.timestamp.getTime()))
    const end = Math.max(...sessionData.map((o) => o.timestamp.getTime()))

    return (end - start) / (1000 * 60) // minutes
  }

  private calculateFatigueLevel(indicators: FatigueDetection['fatigueIndicators']): number {
    const weights = {
      responseTimeIncrease: 0.3,
      accuracyDecrease: 0.4,
      confidenceDecrease: 0.2,
      sessionDuration: 0.1,
    }

    const normalizedDuration = Math.min(1, indicators.sessionDuration / 60) // Normalize to 1 hour

    return (
      indicators.responseTimeIncrease * weights.responseTimeIncrease +
      indicators.accuracyDecrease * weights.accuracyDecrease +
      indicators.confidenceDecrease * weights.confidenceDecrease +
      normalizedDuration * weights.sessionDuration
    )
  }

  private createDefaultSessionOptimization(userId: string, sessionId: string): SessionOptimization {
    return {
      userId,
      sessionId,
      optimalSessionLength: 30,
      recommendedBreakTime: 10,
      fatigueThreshold: this.config.fatigueThreshold,
      performanceDeclineDetected: false,
      suggestedDifficultyAdjustment: 0,
      nextSessionRecommendation: new Date(Date.now() + 4 * 60 * 60 * 1000),
    }
  }

  private detectPerformanceDecline(sessionData: LearningOutcome[]): boolean {
    if (sessionData.length < 6) return false

    const firstHalf = sessionData.slice(0, Math.floor(sessionData.length / 2))
    const secondHalf = sessionData.slice(Math.floor(sessionData.length / 2))

    const firstHalfAccuracy = firstHalf.filter((o) => o.isCorrect).length / firstHalf.length
    const secondHalfAccuracy = secondHalf.filter((o) => o.isCorrect).length / secondHalf.length

    return firstHalfAccuracy - secondHalfAccuracy > 0.2 // 20% decline
  }

  private calculateOptimalSessionLength(sessionData: LearningOutcome[]): number {
    // Find the point where performance starts to decline
    const performanceByTime: { time: number; accuracy: number }[] = []

    for (let i = 5; i < sessionData.length; i += 5) {
      const window = sessionData.slice(Math.max(0, i - 5), i)
      const accuracy = window.filter((o) => o.isCorrect).length / window.length
      const time = this.calculateSessionDuration(sessionData.slice(0, i))
      performanceByTime.push({ time, accuracy })
    }

    // Find optimal point (before significant decline)
    let optimalTime = 30 // Default 30 minutes
    for (let i = 1; i < performanceByTime.length; i++) {
      if (performanceByTime[i].accuracy < performanceByTime[i - 1].accuracy - 0.1) {
        optimalTime = performanceByTime[i - 1].time
        break
      }
    }

    return Math.max(15, Math.min(60, optimalTime)) // Between 15-60 minutes
  }

  private getRecentPerformance(userId: string, armId: string): number[] {
    const history = this.userPerformanceHistory.get(userId) || []
    return history
      .filter((outcome) => outcome.questionId === armId)
      .slice(-10)
      .map((outcome) => (outcome.isCorrect ? 1 : 0))
  }

  private calculateExplorationRatio(stats: BanditArmStats): {
    exploration: number
    exploitation: number
  } {
    // Simple heuristic: if this arm has been pulled much less than average, it's exploration
    const avgPulls = stats.totalPulls
    const explorationThreshold = avgPulls * 0.5

    if (stats.totalPulls < explorationThreshold) {
      return { exploration: 0.8, exploitation: 0.2 }
    } else {
      return { exploration: 0.2, exploitation: 0.8 }
    }
  }

  private calculateAverageResponseTime(userId: string, armId: string): number {
    const history = this.userPerformanceHistory.get(userId) || []
    const armHistory = history.filter((outcome) => outcome.questionId === armId)

    if (armHistory.length === 0) return 0

    return armHistory.reduce((sum, outcome) => sum + outcome.responseTime, 0) / armHistory.length
  }
}
