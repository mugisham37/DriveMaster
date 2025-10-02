/**
 * Confidence interval calculations for Bayesian Knowledge Tracing
 */

export interface ConfidenceInterval {
  lower: number
  upper: number
  confidence: number // e.g., 0.95 for 95% confidence
}

export interface BayesianConfidenceParams {
  alpha: number // Prior alpha parameter (successes + 1)
  beta: number // Prior beta parameter (failures + 1)
  confidence: number // Desired confidence level (e.g., 0.95)
}

/**
 * Calculate Bayesian confidence interval using Beta distribution
 * This provides more accurate confidence intervals for mastery probability
 */
export function calculateBayesianConfidenceInterval(
  params: BayesianConfidenceParams,
): ConfidenceInterval {
  const { alpha, beta, confidence } = params

  // For Beta distribution, we use the quantile function
  // This is an approximation using the normal approximation to Beta
  const mean = alpha / (alpha + beta)
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
  const stdDev = Math.sqrt(variance)

  // Z-score for the desired confidence level
  const zScore = getZScore(confidence)

  const margin = zScore * stdDev

  return {
    lower: Math.max(0, mean - margin),
    upper: Math.min(1, mean + margin),
    confidence,
  }
}

/**
 * Calculate confidence interval based on evidence history
 * Uses the variance in evidence updates to estimate uncertainty
 */
export function calculateEvidenceBasedConfidence(
  evidenceHistory: number[],
  currentMastery: number,
  confidence: number = 0.95,
): ConfidenceInterval {
  if (evidenceHistory.length === 0) {
    return {
      lower: 0,
      upper: 1,
      confidence,
    }
  }

  if (evidenceHistory.length === 1) {
    // With only one evidence point, use a wide interval
    const margin = 0.3
    return {
      lower: Math.max(0, currentMastery - margin),
      upper: Math.min(1, currentMastery + margin),
      confidence,
    }
  }

  // Calculate variance in evidence
  const meanEvidence = evidenceHistory.reduce((sum, e) => sum + e, 0) / evidenceHistory.length
  const variance =
    evidenceHistory.reduce((sum, e) => sum + Math.pow(e - meanEvidence, 2), 0) /
    (evidenceHistory.length - 1)
  const stdDev = Math.sqrt(variance)

  // Z-score for confidence level
  const zScore = getZScore(confidence)

  // Scale the margin based on evidence variance and sample size
  const sampleSizeAdjustment = Math.sqrt(evidenceHistory.length)
  const margin = (zScore * stdDev) / sampleSizeAdjustment

  return {
    lower: Math.max(0, currentMastery - margin),
    upper: Math.min(1, currentMastery + margin),
    confidence,
  }
}

/**
 * Calculate confidence interval using Wilson Score Interval
 * Good for binomial proportions (correct/incorrect responses)
 */
export function calculateWilsonConfidenceInterval(
  successes: number,
  trials: number,
  confidence: number = 0.95,
): ConfidenceInterval {
  if (trials === 0) {
    return {
      lower: 0,
      upper: 1,
      confidence,
    }
  }

  const p = successes / trials
  const z = getZScore(confidence)
  const z2 = z * z

  const denominator = 1 + z2 / trials
  const center = (p + z2 / (2 * trials)) / denominator
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * trials)) / trials)) / denominator

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    confidence,
  }
}

/**
 * Calculate adaptive confidence interval that combines multiple methods
 */
export function calculateAdaptiveConfidenceInterval(
  currentMastery: number,
  evidenceHistory: number[],
  successes: number,
  trials: number,
  confidence: number = 0.95,
): ConfidenceInterval {
  const intervals: ConfidenceInterval[] = []

  // Evidence-based interval
  if (evidenceHistory.length > 0) {
    intervals.push(calculateEvidenceBasedConfidence(evidenceHistory, currentMastery, confidence))
  }

  // Wilson interval for response data
  if (trials > 0) {
    intervals.push(calculateWilsonConfidenceInterval(successes, trials, confidence))
  }

  // Bayesian interval
  if (trials > 0) {
    intervals.push(
      calculateBayesianConfidenceInterval({
        alpha: successes + 1,
        beta: trials - successes + 1,
        confidence,
      }),
    )
  }

  if (intervals.length === 0) {
    return {
      lower: 0,
      upper: 1,
      confidence,
    }
  }

  // Combine intervals using weighted average
  const weights = intervals.map((_, i) => 1 / (i + 1)) // Give more weight to earlier methods
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  const weightedLower =
    intervals.reduce((sum, interval, i) => {
      const weight = weights[i]
      return weight != null ? sum + interval.lower * weight : sum
    }, 0) / totalWeight
  const weightedUpper =
    intervals.reduce((sum, interval, i) => {
      const weight = weights[i]
      return weight != null ? sum + interval.upper * weight : sum
    }, 0) / totalWeight

  return {
    lower: Math.max(0, weightedLower),
    upper: Math.min(1, weightedUpper),
    confidence,
  }
}

/**
 * Get Z-score for given confidence level
 */
function getZScore(confidence: number): number {
  // Common confidence levels and their Z-scores
  const zScores: Record<string, number> = {
    '0.90': 1.645,
    '0.95': 1.96,
    '0.99': 2.576,
    '0.999': 3.291,
  }

  const key = confidence.toFixed(3)
  const zScore = zScores[key]
  if (zScore != null) {
    return zScore
  }

  // Approximation for other confidence levels
  // Using inverse normal CDF approximation
  return approximateInverseNormal((1 + confidence) / 2)
}

/**
 * Approximate inverse normal CDF using Beasley-Springer-Moro algorithm
 */
function approximateInverseNormal(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1')
  }

  // Constants for the approximation
  const a: number[] = [
    0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ]
  const b: number[] = [
    0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ]
  const c: number[] = [
    0, -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ]
  const d: number[] = [
    0, 7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416,
  ]

  let x: number

  if (p < 0.02425) {
    // Lower tail
    const q = Math.sqrt(-2 * Math.log(p))
    const c1 = c[1] ?? 0,
      c2 = c[2] ?? 0,
      c3 = c[3] ?? 0,
      c4 = c[4] ?? 0,
      c5 = c[5] ?? 0,
      c6 = c[6] ?? 0
    const d1 = d[1] ?? 0,
      d2 = d[2] ?? 0,
      d3 = d[3] ?? 0,
      d4 = d[4] ?? 0
    x =
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  } else if (p > 0.97575) {
    // Upper tail
    const q = Math.sqrt(-2 * Math.log(1 - p))
    const c1 = c[1] ?? 0,
      c2 = c[2] ?? 0,
      c3 = c[3] ?? 0,
      c4 = c[4] ?? 0,
      c5 = c[5] ?? 0,
      c6 = c[6] ?? 0
    const d1 = d[1] ?? 0,
      d2 = d[2] ?? 0,
      d3 = d[3] ?? 0,
      d4 = d[4] ?? 0
    x =
      -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
  } else {
    // Central region
    const q = p - 0.5
    const r = q * q
    const a1 = a[1] ?? 0,
      a2 = a[2] ?? 0,
      a3 = a[3] ?? 0,
      a4 = a[4] ?? 0,
      a5 = a[5] ?? 0,
      a6 = a[6] ?? 0
    const b1 = b[1] ?? 0,
      b2 = b[2] ?? 0,
      b3 = b[3] ?? 0,
      b4 = b[4] ?? 0,
      b5 = b[5] ?? 0
    x =
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
  }

  return x
}

/**
 * Calculate credible interval for mastery probability
 * This is the Bayesian equivalent of confidence interval
 */
export function calculateCredibleInterval(
  priorAlpha: number,
  priorBeta: number,
  successes: number,
  failures: number,
  credibility: number = 0.95,
): ConfidenceInterval {
  const posteriorAlpha = priorAlpha + successes
  const posteriorBeta = priorBeta + failures

  return calculateBayesianConfidenceInterval({
    alpha: posteriorAlpha,
    beta: posteriorBeta,
    confidence: credibility,
  })
}

/**
 * Utility to determine if mastery is significantly different from a threshold
 */
export function isMasterySignificant(
  _currentMastery: number,
  threshold: number,
  confidenceInterval: ConfidenceInterval,
): {
  isSignificant: boolean
  direction: 'above' | 'below' | 'uncertain'
  confidence: number
} {
  if (confidenceInterval.lower > threshold) {
    return {
      isSignificant: true,
      direction: 'above',
      confidence: confidenceInterval.confidence,
    }
  }

  if (confidenceInterval.upper < threshold) {
    return {
      isSignificant: true,
      direction: 'below',
      confidence: confidenceInterval.confidence,
    }
  }

  return {
    isSignificant: false,
    direction: 'uncertain',
    confidence: confidenceInterval.confidence,
  }
}
