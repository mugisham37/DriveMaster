import type { CognitiveProfile } from '../types/bkt.types'

export interface BKTParams {
  pL0: number // Initial knowledge probability
  pT: number // Learning rate
  pG: number // Guess probability
  pS: number // Slip probability
}

export interface EnhancedBKTParams extends BKTParams {
  decayRate: number
  learningVelocity: number
  confidenceWeight: number
  responseTimeWeight: number
}

export interface BKTUpdateContext {
  correct: boolean
  responseTime?: number | undefined
  confidence?: number | undefined
  timeSinceLastInteraction?: number | undefined
  attempts?: number
  itemDifficulty?: number | undefined
}

export interface ConceptDependency {
  prerequisite: string
  weight: number
}

/**
 * Enhanced BKT implementation with temporal decay and individual factors
 */
export class BayesianKnowledgeTracing {
  /**
   * Apply temporal decay to knowledge state based on time since last interaction
   */
  static applyTemporalDecay(
    currentMastery: number,
    timeSinceLastMs: number,
    decayRate: number = 0.05,
  ): number {
    const hoursSince = timeSinceLastMs / (1000 * 60 * 60)
    const decay = Math.exp(-decayRate * hoursSince)
    return currentMastery * decay
  }

  /**
   * Calculate response time factor (faster responses indicate better mastery)
   */
  static calculateResponseTimeFactor(
    responseTime: number,
    expectedTime: number = 30000, // 30 seconds default
  ): number {
    if (responseTime <= 0) return 1.0

    // Sigmoid function to map response time to mastery factor
    const ratio = responseTime / expectedTime
    return 1 / (1 + Math.exp(2 * (ratio - 1)))
  }

  /**
   * Calculate confidence factor
   */
  static calculateConfidenceFactor(confidence?: number): number {
    if (confidence === undefined || confidence === null || confidence === 0) return 1.0
    // Map 1-5 scale to 0.5-1.5 multiplier
    return 0.5 + (confidence - 1) * 0.25
  }

  /**
   * Enhanced BKT update with individual learning patterns
   */
  static updateKnowledgeState(
    params: EnhancedBKTParams,
    context: BKTUpdateContext,
    currentMastery: number,
  ): { newMastery: number; evidence: number } {
    const { pT, pG, pS, learningVelocity, confidenceWeight, responseTimeWeight } = params
    const { correct, responseTime, confidence, attempts = 1 } = context

    // Apply temporal decay if time since last interaction is provided
    let priorMastery = currentMastery
    if (
      context.timeSinceLastInteraction !== undefined &&
      context.timeSinceLastInteraction !== null &&
      context.timeSinceLastInteraction > 0
    ) {
      priorMastery = this.applyTemporalDecay(
        currentMastery,
        context.timeSinceLastInteraction,
        params.decayRate,
      )
    }

    // Basic BKT update
    const pNotKnown = 1 - priorMastery
    const evidenceGivenCorrect = correct
      ? priorMastery * (1 - pS) + pNotKnown * pG
      : priorMastery * pS + pNotKnown * (1 - pG)

    const posteriorGivenEvidence = correct
      ? (priorMastery * (1 - pS)) / evidenceGivenCorrect
      : (priorMastery * pS) / evidenceGivenCorrect

    // Apply learning with individual velocity
    const adjustedLearningRate = pT * learningVelocity
    let newMastery = posteriorGivenEvidence + (1 - posteriorGivenEvidence) * adjustedLearningRate

    // Apply response time factor
    if (
      responseTime !== undefined &&
      responseTime !== null &&
      responseTime > 0 &&
      responseTimeWeight > 0
    ) {
      const responseTimeFactor = this.calculateResponseTimeFactor(responseTime)
      newMastery = newMastery + (responseTimeFactor - 1) * responseTimeWeight * newMastery
    }

    // Apply confidence factor
    if (confidence !== undefined && confidence !== null && confidence > 0 && confidenceWeight > 0) {
      const confidenceFactor = this.calculateConfidenceFactor(confidence)
      newMastery = newMastery + (confidenceFactor - 1) * confidenceWeight * newMastery
    }

    // Adjust for multiple attempts (lower mastery gain for multiple attempts)
    if (attempts > 1) {
      const attemptPenalty = Math.pow(0.8, attempts - 1)
      newMastery = priorMastery + (newMastery - priorMastery) * attemptPenalty
    }

    // Ensure bounds
    newMastery = Math.max(0.001, Math.min(0.999, newMastery))

    // Calculate evidence strength for this update
    const evidence = Math.abs(newMastery - priorMastery)

    return { newMastery, evidence }
  }

  /**
   * Apply concept dependencies to influence mastery probability
   */
  static applyConceptDependencies(
    currentMastery: number,
    dependencies: ConceptDependency[],
    prerequisiteMasteries: Map<string, number>,
  ): number {
    if (dependencies.length === 0) return currentMastery

    let dependencyInfluence = 0
    let totalWeight = 0

    for (const dep of dependencies) {
      const prereqMastery = prerequisiteMasteries.get(dep.prerequisite) ?? 0
      dependencyInfluence += prereqMastery * dep.weight
      totalWeight += dep.weight
    }

    if (totalWeight === 0) return currentMastery

    const avgPrereqMastery = dependencyInfluence / totalWeight

    // Concept mastery is influenced by prerequisite mastery
    // If prerequisites are mastered, learning is easier
    const dependencyBonus = avgPrereqMastery * 0.2 // 20% influence

    return Math.max(0, Math.min(1, currentMastery + dependencyBonus))
  }

  /**
   * Estimate initial knowledge parameters for a new user/concept pair
   */
  static estimateInitialParams(
    conceptKey: string,
    userProfile?: CognitiveProfile,
  ): EnhancedBKTParams {
    // Default parameters - could be learned from data
    const defaults: EnhancedBKTParams = {
      pL0: 0.1, // Assume low initial knowledge
      pT: 0.3, // Moderate learning rate
      pG: 0.2, // 20% chance of correct guess
      pS: 0.1, // 10% chance of slip
      decayRate: 0.05,
      learningVelocity: 1.0,
      confidenceWeight: 0.1,
      responseTimeWeight: 0.1,
    }

    // Adjust based on concept difficulty
    if (conceptKey.includes('advanced') || conceptKey.includes('complex')) {
      defaults.pL0 = 0.05
      defaults.pT = 0.2
      defaults.pG = 0.25
    }

    // Adjust based on user cognitive profile if available
    if (userProfile) {
      if (userProfile.learningSpeed === 'fast') {
        defaults.learningVelocity = 1.3
        defaults.pT = 0.4
      } else if (userProfile.learningSpeed === 'slow') {
        defaults.learningVelocity = 0.7
        defaults.pT = 0.2
      }

      if (userProfile.confidenceCorrelation === 'high') {
        defaults.confidenceWeight = 0.2
      }

      if (userProfile.responseTimeCorrelation === 'high') {
        defaults.responseTimeWeight = 0.2
      }
    }

    return defaults
  }

  /**
   * Predict probability of correct response given current mastery
   */
  static predictCorrectProbability(mastery: number, pG: number, pS: number): number {
    return mastery * (1 - pS) + (1 - mastery) * pG
  }

  /**
   * Calculate learning progress rate
   */
  static calculateLearningRate(masteryHistory: number[], timeWindow: number = 10): number {
    if (masteryHistory.length < 2) return 0

    const recent = masteryHistory.slice(-timeWindow)
    if (recent.length < 2) return 0

    const firstMastery = recent[0]
    const lastMastery = recent[recent.length - 1]

    if (firstMastery === undefined || lastMastery === undefined) return 0

    const improvement = lastMastery - firstMastery

    return improvement / recent.length
  }
}

// Legacy function for backward compatibility
export function bktUpdate(params: BKTParams, correct: boolean, prior?: number): number {
  const enhancedParams: EnhancedBKTParams = {
    ...params,
    decayRate: 0.05,
    learningVelocity: 1.0,
    confidenceWeight: 0.1,
    responseTimeWeight: 0.1,
  }

  const context: BKTUpdateContext = {
    correct,
  }
  const currentMastery = prior ?? params.pL0

  const result = BayesianKnowledgeTracing.updateKnowledgeState(
    enhancedParams,
    context,
    currentMastery,
  )

  return result.newMastery
}
