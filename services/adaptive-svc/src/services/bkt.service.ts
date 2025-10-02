import {
  BayesianKnowledgeTracing,
  type EnhancedBKTParams,
  type BKTUpdateContext,
} from '../algorithms/bkt.js'
import type {
  BKTServiceInterface,
  KnowledgeState,
  UserResponse,
  MasteryProbability,
  ConceptDependency,
  ConceptGraph,
  CognitiveProfile,
  LearningProgress,
  ConceptMastery,
  BKTConfig,
} from '../types/bkt.types.js'
import { calculateAdaptiveConfidenceInterval } from '../utils/confidence-intervals.js'

export class BKTService implements BKTServiceInterface {
  private config: BKTConfig
  private knowledgeStates: Map<string, KnowledgeState> = new Map()
  private conceptGraphs: Map<string, ConceptGraph> = new Map()
  private cognitiveProfiles: Map<string, CognitiveProfile> = new Map()

  constructor(config: BKTConfig) {
    this.config = config
  }

  /**
   * Update knowledge state based on user response
   */
  async updateKnowledgeState(response: UserResponse): Promise<KnowledgeState> {
    const stateKey = `${response.userId}:${response.conceptId}`
    let currentState = this.knowledgeStates.get(stateKey)

    // Initialize state if it doesn't exist
    if (!currentState) {
      currentState = await this.initializeKnowledgeState(response.userId, response.conceptId)
    }

    // Get user's cognitive profile for personalized parameters
    const cognitiveProfile = await this.getCognitiveProfile(response.userId)

    // Create enhanced BKT parameters
    const enhancedParams: EnhancedBKTParams = {
      pL0: currentState.initialKnowledge,
      pT: currentState.learningRate,
      pG: currentState.guessParameter,
      pS: currentState.slipParameter,
      decayRate: currentState.decayRate,
      learningVelocity: currentState.learningVelocity,
      confidenceWeight: currentState.confidenceWeight,
      responseTimeWeight: currentState.responseTimeWeight,
    }

    // Create update context
    const updateContext: BKTUpdateContext = {
      correct: response.isCorrect,
      ...(response.responseTime != null && { responseTime: response.responseTime }),
      ...(response.confidence != null && { confidence: response.confidence }),
      ...(response.attempts != null && { attempts: response.attempts }),
      timeSinceLastInteraction: Date.now() - currentState.lastUpdated.getTime(),
      itemDifficulty: 0.5, // Default difficulty, could be retrieved from item metadata
    }

    // Apply concept dependencies if they exist
    let adjustedMastery = currentState.masteryProbability
    const dependencies = await this.getConceptDependencies(response.conceptId)
    if (dependencies.length > 0) {
      const prerequisiteMasteries = await this.getPrerequisiteMasteries(
        response.userId,
        dependencies,
      )
      adjustedMastery = BayesianKnowledgeTracing.applyConceptDependencies(
        currentState.masteryProbability,
        dependencies,
        prerequisiteMasteries,
      )
    }

    // Update knowledge state using BKT algorithm
    const bktResult = BayesianKnowledgeTracing.updateKnowledgeState(
      enhancedParams,
      updateContext,
      adjustedMastery,
    )

    // Update the knowledge state
    currentState.masteryProbability = bktResult.newMastery
    currentState.lastUpdated = new Date()
    currentState.updateCount += 1
    currentState.evidenceHistory.push(bktResult.evidence)

    // Keep only recent evidence history
    if (currentState.evidenceHistory.length > this.config.maxUpdateHistory) {
      currentState.evidenceHistory = currentState.evidenceHistory.slice(
        -this.config.maxUpdateHistory,
      )
    }

    // Adapt parameters based on learning patterns if enabled
    if (this.config.adaptiveParametersEnabled) {
      await this.adaptParameters(currentState, cognitiveProfile)
    }

    // Store updated state
    this.knowledgeStates.set(stateKey, currentState)

    return currentState
  }

  /**
   * Get mastery probability with confidence interval
   */
  async getMasteryProbability(userId: string, conceptId: string): Promise<MasteryProbability> {
    const stateKey = `${userId}:${conceptId}`
    let state = this.knowledgeStates.get(stateKey)

    if (!state) {
      state = await this.initializeKnowledgeState(userId, conceptId)
    }

    // Apply temporal decay if enabled
    let currentMastery = state.masteryProbability
    if (this.config.temporalDecayEnabled) {
      const timeSinceUpdate = Date.now() - state.lastUpdated.getTime()
      currentMastery = BayesianKnowledgeTracing.applyTemporalDecay(
        state.masteryProbability,
        timeSinceUpdate,
        state.decayRate,
      )
    }

    // Calculate confidence interval based on evidence history
    const confidence = this.calculateConfidenceInterval(state.evidenceHistory, currentMastery)
    const evidence =
      state.evidenceHistory.length > 0
        ? (state.evidenceHistory[state.evidenceHistory.length - 1] ?? 0)
        : 0

    return {
      probability: currentMastery,
      confidenceInterval: confidence,
      evidence,
      lastUpdated: state.lastUpdated,
    }
  }

  /**
   * Predict probability of correct response
   */
  async predictPerformance(userId: string, conceptId: string): Promise<number> {
    const mastery = await this.getMasteryProbability(userId, conceptId)
    const state = this.knowledgeStates.get(`${userId}:${conceptId}`)

    if (!state) {
      return this.config.defaultParams.pG // Default to guess probability
    }

    return BayesianKnowledgeTracing.predictCorrectProbability(
      mastery.probability,
      state.guessParameter,
      state.slipParameter,
    )
  }

  /**
   * Get concept dependencies
   */
  getConceptDependencies(conceptId: string): Promise<ConceptDependency[]> {
    const conceptGraph = this.conceptGraphs.get(conceptId)
    return Promise.resolve(conceptGraph?.prerequisites ?? [])
  }

  /**
   * Update concept graph
   */
  updateConceptGraph(conceptGraph: ConceptGraph): Promise<void> {
    this.conceptGraphs.set(conceptGraph.conceptId, conceptGraph)
    return Promise.resolve()
  }

  /**
   * Get user's cognitive profile
   */
  getCognitiveProfile(userId: string): Promise<CognitiveProfile> {
    let profile = this.cognitiveProfiles.get(userId)

    if (!profile) {
      // Create default profile
      profile = {
        userId,
        learningSpeed: 'average',
        preferredDifficulty: 'adaptive',
        confidenceCorrelation: 'medium',
        responseTimeCorrelation: 'medium',
        optimalSessionLength: 30,
        peakPerformanceHours: [9, 10, 11, 14, 15, 16], // Default peak hours
        forgettingCurveRate: 0.05,
        motivationFactors: ['progress', 'achievements', 'social'],
        lastUpdated: new Date(),
      }
      this.cognitiveProfiles.set(userId, profile)
    }

    return Promise.resolve(profile)
  }

  /**
   * Update cognitive profile
   */
  async updateCognitiveProfile(
    userId: string,
    profileUpdate: Partial<CognitiveProfile>,
  ): Promise<void> {
    const currentProfile = await this.getCognitiveProfile(userId)
    const updatedProfile = {
      ...currentProfile,
      ...profileUpdate,
      lastUpdated: new Date(),
    }
    this.cognitiveProfiles.set(userId, updatedProfile)
  }

  /**
   * Get learning progress for user
   */
  async getLearningProgress(userId: string, timeWindow: number = 30): Promise<LearningProgress> {
    const userStates = Array.from(this.knowledgeStates.entries())
      .filter(([key]) => key.startsWith(`${userId}:`))
      .map(([, state]) => state)

    if (userStates.length === 0) {
      return this.createEmptyProgress(userId)
    }

    const conceptProgress = await Promise.all(
      userStates.map((state) => this.createConceptMastery(state)),
    )

    const overallProgress =
      conceptProgress.reduce((sum, concept) => sum + concept.masteryLevel, 0) /
      conceptProgress.length
    const averageAccuracy =
      conceptProgress.reduce((sum, concept) => sum + concept.masteryLevel, 0) /
      conceptProgress.length

    // Calculate learning velocity from mastery history
    const learningVelocity = this.calculateLearningVelocity(userStates)

    // Calculate improvement rate
    const improvementRate = this.calculateImprovementRate(userStates, timeWindow)

    // Estimate completion date
    const predictedCompletionDate = this.estimateCompletionDate(overallProgress, learningVelocity)

    return {
      userId,
      overallProgress,
      conceptProgress,
      learningVelocity,
      streakDays: 0, // Would be calculated from session data
      totalTimeSpent: 0, // Would be calculated from session data
      averageAccuracy,
      improvementRate,
      predictedCompletionDate,
    }
  }

  /**
   * Get concepts where user is struggling
   */
  async getWeakConcepts(userId: string, threshold: number = 0.3): Promise<ConceptMastery[]> {
    const progress = await this.getLearningProgress(userId)
    return progress.conceptProgress.filter((concept) => concept.masteryLevel < threshold)
  }

  /**
   * Get concepts ready for review
   */
  async getReadyConcepts(userId: string): Promise<ConceptMastery[]> {
    const progress = await this.getLearningProgress(userId)
    return progress.conceptProgress.filter(
      (concept) =>
        concept.masteryLevel >= this.config.masteryThreshold && concept.status === 'reviewing',
    )
  }

  // Private helper methods

  private async initializeKnowledgeState(
    userId: string,
    conceptId: string,
  ): Promise<KnowledgeState> {
    const cognitiveProfile = await this.getCognitiveProfile(userId)

    const params = BayesianKnowledgeTracing.estimateInitialParams(conceptId, cognitiveProfile)

    const state: KnowledgeState = {
      userId,
      conceptId,
      masteryProbability: params.pL0,
      initialKnowledge: params.pL0,
      learningRate: params.pT,
      guessParameter: params.pG,
      slipParameter: params.pS,
      learningVelocity: params.learningVelocity,
      confidenceWeight: params.confidenceWeight,
      responseTimeWeight: params.responseTimeWeight,
      decayRate: params.decayRate,
      lastUpdated: new Date(),
      updateCount: 0,
      evidenceHistory: [],
    }

    return state
  }

  private async getPrerequisiteMasteries(
    userId: string,
    dependencies: ConceptDependency[],
  ): Promise<Map<string, number>> {
    const masteries = new Map<string, number>()

    for (const dep of dependencies) {
      const mastery = await this.getMasteryProbability(userId, dep.prerequisite)
      masteries.set(dep.prerequisite, mastery.probability)
    }

    return masteries
  }

  private calculateConfidenceInterval(
    evidenceHistory: number[],
    currentMastery: number,
    successes: number = 0,
    trials: number = 0,
  ): { lower: number; upper: number } {
    const interval = calculateAdaptiveConfidenceInterval(
      currentMastery,
      evidenceHistory,
      successes,
      trials,
      0.95,
    )

    return {
      lower: interval.lower,
      upper: interval.upper,
    }
  }

  private adaptParameters(state: KnowledgeState, profile: CognitiveProfile): Promise<void> {
    // Adapt learning velocity based on recent performance
    if (state.evidenceHistory.length >= 5) {
      const recentEvidence = state.evidenceHistory.slice(-5)
      const avgEvidence = recentEvidence.reduce((sum, e) => sum + e, 0) / recentEvidence.length

      // Increase learning velocity if evidence is consistently high
      if (avgEvidence > 0.1) {
        state.learningVelocity = Math.min(2.0, state.learningVelocity * 1.1)
      } else if (avgEvidence < 0.05) {
        state.learningVelocity = Math.max(0.5, state.learningVelocity * 0.9)
      }
    }

    // Adapt decay rate based on user's forgetting curve
    state.decayRate = profile.forgettingCurveRate
    return Promise.resolve()
  }

  private createConceptMastery(state: KnowledgeState): Promise<ConceptMastery> {
    const conceptGraph = this.conceptGraphs.get(state.conceptId)

    let status: ConceptMastery['status'] = 'not_started'
    if (state.masteryProbability >= this.config.masteryThreshold) {
      status = 'mastered'
    } else if (state.updateCount > 0) {
      status = state.masteryProbability > 0.5 ? 'reviewing' : 'learning'
    }

    const result: ConceptMastery = {
      conceptId: state.conceptId,
      conceptName: conceptGraph?.name ?? state.conceptId,
      masteryLevel: state.masteryProbability,
      confidence:
        state.evidenceHistory.length > 0
          ? (state.evidenceHistory[state.evidenceHistory.length - 1] ?? 0)
          : 0,
      lastPracticed: state.lastUpdated,
      practiceCount: state.updateCount,
      averageResponseTime: 0, // Would be calculated from response data
      difficulty: conceptGraph?.difficulty ?? 0.5,
      status,
    }

    return Promise.resolve(result)
  }

  private createEmptyProgress(userId: string): LearningProgress {
    return {
      userId,
      overallProgress: 0,
      conceptProgress: [],
      learningVelocity: 0,
      streakDays: 0,
      totalTimeSpent: 0,
      averageAccuracy: 0,
      improvementRate: 0,
      predictedCompletionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    }
  }

  private calculateLearningVelocity(states: KnowledgeState[]): number {
    if (states.length === 0) return 0

    const velocities = states.map((state) => state.learningVelocity)
    return velocities.reduce((sum, v) => sum + v, 0) / velocities.length
  }

  private calculateImprovementRate(states: KnowledgeState[], timeWindow: number): number {
    // This would typically analyze mastery changes over time
    // For now, return average evidence from recent updates
    const recentEvidence = states
      .flatMap((state) => state.evidenceHistory.slice(-timeWindow))
      .filter((evidence) => evidence > 0)

    if (recentEvidence.length === 0) return 0

    return recentEvidence.reduce((sum, e) => sum + e, 0) / recentEvidence.length
  }

  private estimateCompletionDate(overallProgress: number, learningVelocity: number): Date {
    if (learningVelocity <= 0 || overallProgress >= 1) {
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default to 1 year
    }

    const remainingProgress = 1 - overallProgress
    const estimatedDays = (remainingProgress / learningVelocity) * 30 // Rough estimation

    return new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000)
  }
}
