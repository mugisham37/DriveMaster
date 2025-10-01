export interface IRTItemParams {
  discrimination: number // 'a' parameter - how well item discriminates ability
  difficulty: number // 'b' parameter - item difficulty
  guessing: number // 'c' parameter - probability of correct guess
}

export interface IRTResponse {
  itemId: string
  correct: boolean
  responseTime?: number
  confidence?: number
  params: IRTItemParams
}

export interface IRTEstimationResult {
  theta: number // Ability estimate
  standardError: number // Standard error of estimate
  lowerBound: number // 95% confidence lower bound
  upperBound: number // 95% confidence upper bound
  iterations: number // Number of estimation iterations
  converged: boolean // Whether estimation converged
}

export interface IRTCalibrationData {
  itemId: string
  responses: Array<{ correct: boolean; theta?: number }>
  totalResponses: number
  correctResponses: number
}

/**
 * Item Response Theory implementation for adaptive testing and calibration
 */
export class ItemResponseTheory {
  // Constants for IRT estimation
  static readonly MAX_THETA = 4.0
  static readonly MIN_THETA = -4.0
  static readonly CONVERGENCE_CRITERION = 0.001
  static readonly MAX_ITERATIONS = 100

  /**
   * Calculate probability of correct response using 3PL IRT model
   * P(correct) = c + (1-c) / (1 + exp(-a(θ-b)))
   */
  static calculateProbability(theta: number, params: IRTItemParams): number {
    const { discrimination: a, difficulty: b, guessing: c } = params
    const exponent = -a * (theta - b)
    const probability = c + (1 - c) / (1 + Math.exp(exponent))

    return Math.max(0.001, Math.min(0.999, probability))
  }

  /**
   * Calculate information function for an item at given ability level
   * Information = a² * P * Q * ((1-c)/(c+(1-c)*P))²
   */
  static calculateInformation(theta: number, params: IRTItemParams): number {
    const { discrimination: a, guessing: c } = params
    const probability = this.calculateProbability(theta, params)
    const q = 1 - probability

    if (c >= 0.999 || probability <= c) return 0

    const term1 = a * a * probability * q
    const term2 = Math.pow((1 - c) / (c + (1 - c) * probability), 2)

    return term1 * term2
  }

  /**
   * Calculate Fisher Information across multiple items
   */
  static calculateFisherInformation(theta: number, itemParams: IRTItemParams[]): number {
    return itemParams.reduce((total, params) => total + this.calculateInformation(theta, params), 0)
  }

  /**
   * Estimate ability (theta) using Maximum Likelihood Estimation
   */
  static estimateAbility(
    responses: IRTResponse[],
    initialTheta: number = 0,
    priorMean: number = 0,
    priorVariance: number = 1,
  ): IRTEstimationResult {
    if (responses.length === 0) {
      return {
        theta: initialTheta,
        standardError: Math.sqrt(priorVariance),
        lowerBound: initialTheta - 1.96 * Math.sqrt(priorVariance),
        upperBound: initialTheta + 1.96 * Math.sqrt(priorVariance),
        iterations: 0,
        converged: false,
      }
    }

    let theta = initialTheta
    let converged = false
    let iterations = 0

    for (iterations = 0; iterations < this.MAX_ITERATIONS; iterations++) {
      const { firstDerivative, secondDerivative } = this.calculateLogLikelihoodDerivatives(
        theta,
        responses,
      )

      // Add prior information (Bayesian estimation)
      const priorFirst = -(theta - priorMean) / priorVariance
      const priorSecond = -1 / priorVariance

      const totalFirst = firstDerivative + priorFirst
      const totalSecond = secondDerivative + priorSecond

      // Newton-Raphson update
      const change = -totalFirst / totalSecond
      const newTheta = Math.max(this.MIN_THETA, Math.min(this.MAX_THETA, theta + change))

      if (Math.abs(change) < this.CONVERGENCE_CRITERION) {
        converged = true
        theta = newTheta
        break
      }

      theta = newTheta
    }

    // Calculate standard error from information matrix
    const information = this.calculateTestInformation(
      theta,
      responses.map((r) => r.params),
    )
    const standardError = information > 0 ? 1 / Math.sqrt(information) : Math.sqrt(priorVariance)

    return {
      theta,
      standardError,
      lowerBound: theta - 1.96 * standardError,
      upperBound: theta + 1.96 * standardError,
      iterations: iterations + 1,
      converged,
    }
  }

  /**
   * Calculate log-likelihood derivatives for Newton-Raphson estimation
   */
  static calculateLogLikelihoodDerivatives(
    theta: number,
    responses: IRTResponse[],
  ): { firstDerivative: number; secondDerivative: number } {
    let firstDerivative = 0
    let secondDerivative = 0

    for (const response of responses) {
      const { correct, params } = response
      const { discrimination: a, difficulty: b, guessing: c } = params

      const probability = this.calculateProbability(theta, params)
      const exponent = Math.exp(-a * (theta - b))
      const denominator = 1 + exponent

      // First derivative
      const p_star = (1 - c) / denominator
      const correctNum = correct ? 1 : 0
      const incorrectNum = correct ? 0 : 1
      const first = a * p_star * (correctNum / probability - incorrectNum / (1 - probability))
      firstDerivative += first

      // Second derivative
      const second =
        ((-a * a * p_star * exponent) / (denominator * denominator)) *
        (correctNum / (probability * probability) +
          incorrectNum / ((1 - probability) * (1 - probability)))
      secondDerivative += second
    }

    return { firstDerivative, secondDerivative }
  }

  /**
   * Calculate test information (sum of item information functions)
   */
  static calculateTestInformation(theta: number, itemParams: IRTItemParams[]): number {
    return itemParams.reduce((total, params) => total + this.calculateInformation(theta, params), 0)
  }

  /**
   * Select optimal next item for adaptive testing
   */
  static selectOptimalItem(
    theta: number,
    availableItems: Array<{ id: string; params: IRTItemParams }>,
    administeredItems: Set<string> = new Set(),
  ): { itemId: string; information: number; probability: number } | null {
    let bestItem: { itemId: string; information: number; probability: number } | null = null
    let maxInformation = 0

    for (const item of availableItems) {
      if (administeredItems.has(item.id)) continue

      const information = this.calculateInformation(theta, item.params)
      const probability = this.calculateProbability(theta, item.params)

      // Prefer items with high information and reasonable success probability (0.5-0.8)
      const successProbabilityWeight = this.calculateSuccessProbabilityWeight(probability)
      const weightedInformation = information * successProbabilityWeight

      if (weightedInformation > maxInformation) {
        maxInformation = weightedInformation
        bestItem = {
          itemId: item.id,
          information,
          probability,
        }
      }
    }

    return bestItem
  }

  /**
   * Calculate weight for success probability (prefer items around 50-80% success)
   */
  static calculateSuccessProbabilityWeight(probability: number): number {
    // Optimal range for learning and information
    if (probability >= 0.5 && probability <= 0.8) {
      return 1.0
    } else if (probability >= 0.3 && probability <= 0.9) {
      return 0.8
    } else if (probability >= 0.2 && probability <= 0.95) {
      return 0.6
    } else {
      return 0.3
    }
  }

  /**
   * Calibrate item parameters using responses from multiple users
   */
  static calibrateItems(
    calibrationData: IRTCalibrationData[],
    userAbilities: Map<string, number>,
  ): Map<string, IRTItemParams> {
    const calibratedItems = new Map<string, IRTItemParams>()

    for (const itemData of calibrationData) {
      const params = this.calibrateItem(itemData, userAbilities)
      if (params) {
        calibratedItems.set(itemData.itemId, params)
      }
    }

    return calibratedItems
  }

  /**
   * Calibrate single item using response data
   */
  static calibrateItem(
    itemData: IRTCalibrationData,
    userAbilities: Map<string, number>,
  ): IRTItemParams | null {
    const { responses } = itemData

    if (responses.length < 10) {
      // Not enough data for reliable calibration
      return this.getDefaultItemParams(
        itemData.correctResponses / Math.max(itemData.totalResponses, 1),
      )
    }

    // Simple calibration using difficulty as logit of p-correct
    const pCorrect = itemData.correctResponses / itemData.totalResponses
    const logitDifficulty = Math.log(pCorrect / (1 - pCorrect))

    // Estimate discrimination from response pattern
    const discrimination = this.estimateDiscrimination(responses, userAbilities)

    // Estimate guessing parameter
    const guessing = this.estimateGuessing(responses, userAbilities)

    return {
      discrimination,
      difficulty: -logitDifficulty, // Negative because higher p-correct = easier item
      guessing,
    }
  }

  /**
   * Estimate discrimination parameter from response patterns
   */
  static estimateDiscrimination(
    responses: Array<{ correct: boolean; theta?: number }>,
    _userAbilities: Map<string, number>,
  ): number {
    // Simple correlation-based estimation
    const validResponses = responses.filter((r) => r.theta !== undefined)

    if (validResponses.length < 5) return 1.0

    // Calculate point-biserial correlation
    const abilities = validResponses.map((r) => r.theta ?? 0)
    const correctness = validResponses.map((r) => (r.correct ? 1 : 0))

    const correlation = this.calculateCorrelation(abilities, correctness)

    // Convert correlation to discrimination (rough approximation)
    return Math.max(0.5, Math.min(3.0, Math.abs(correlation) * 2.5))
  }

  /**
   * Estimate guessing parameter
   */
  static estimateGuessing(
    responses: Array<{ correct: boolean; theta?: number }>,
    _userAbilities: Map<string, number>,
  ): number {
    // Find lowest ability users and their performance
    const validResponses = responses.filter((r) => r.theta !== undefined && r.theta < -1)

    if (validResponses.length < 3) return 0.2 // Default guess rate

    const lowAbilityCorrect = validResponses.filter((r) => r.correct).length
    const guessRate = lowAbilityCorrect / validResponses.length

    return Math.max(0.0, Math.min(0.35, guessRate))
  }

  /**
   * Calculate correlation coefficient
   */
  static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0

    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * (y[i] ?? 0), 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Get default item parameters based on difficulty
   */
  static getDefaultItemParams(pCorrect: number): IRTItemParams {
    const difficulty = Math.log(pCorrect / (1 - pCorrect))

    return {
      discrimination: 1.0,
      difficulty: -difficulty,
      guessing: Math.max(0.1, Math.min(0.25, 0.5 - pCorrect * 0.3)),
    }
  }

  /**
   * Calculate ability estimation precision
   */
  static calculatePrecision(theta: number, itemParams: IRTItemParams[]): number {
    const information = this.calculateTestInformation(theta, itemParams)
    return information > 0 ? 1 / Math.sqrt(information) : 2.0
  }

  /**
   * Determine if ability estimation has sufficient precision
   */
  static hasSufficientPrecision(
    theta: number,
    itemParams: IRTItemParams[],
    requiredPrecision: number = 0.3,
  ): boolean {
    const precision = this.calculatePrecision(theta, itemParams)
    return precision <= requiredPrecision
  }

  /**
   * Simulate responses for testing purposes
   */
  static simulateResponse(theta: number, params: IRTItemParams): boolean {
    const probability = this.calculateProbability(theta, params)
    return Math.random() < probability
  }

  /**
   * Calculate expected score for a test
   */
  static calculateExpectedScore(theta: number, itemParams: IRTItemParams[]): number {
    return itemParams.reduce((score, params) => score + this.calculateProbability(theta, params), 0)
  }

  /**
   * Find ability level for target expected score
   */
  static findAbilityForScore(
    targetScore: number,
    itemParams: IRTItemParams[],
    tolerance: number = 0.01,
  ): number {
    let lowerBound = this.MIN_THETA
    let upperBound = this.MAX_THETA

    for (let i = 0; i < 50; i++) {
      const midpoint = (lowerBound + upperBound) / 2
      const expectedScore = this.calculateExpectedScore(midpoint, itemParams)

      if (Math.abs(expectedScore - targetScore) < tolerance) {
        return midpoint
      }

      if (expectedScore < targetScore) {
        lowerBound = midpoint
      } else {
        upperBound = midpoint
      }
    }

    return (lowerBound + upperBound) / 2
  }
}

// Legacy function for backward compatibility
export function estimateTheta(
  responses: Array<{ a: number; b: number; c: number; correct: boolean }>,
): number {
  const irtResponses: IRTResponse[] = responses.map((r, index) => ({
    itemId: `item_${index}`,
    correct: r.correct,
    params: {
      discrimination: r.a,
      difficulty: r.b,
      guessing: r.c,
    },
  }))

  const result = ItemResponseTheory.estimateAbility(irtResponses)
  return result.theta
}
