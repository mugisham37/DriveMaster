export interface BanditArm {
  id: string
  conceptKey: string
  difficulty: number
  discrimination?: number
  engagement?: number
}

export interface BanditArmStats {
  alphaSuccess: number
  betaFailure: number
  totalPulls: number
  totalRewards: number
  avgReward: number
  lastPulled?: Date
}

export interface ContextualFeatures {
  userMastery: number
  timeOfDay: string
  sessionGoal: string
  fatigueLevel: number
  previousPerformance: number
  conceptDifficulty: number
  studyStreak: number
}

export interface BanditConfig {
  explorationRate: number
  zpdMinSuccess: number  // Zone of Proximal Development min success rate
  zpdMaxSuccess: number  // Zone of Proximal Development max success rate
  engagementWeight: number
  difficultyWeight: number
  freshnessWeight: number
}

/**
 * Advanced Multi-Armed Bandit with Thompson Sampling for question selection
 */
export class MultiArmedBandit {
  
  /**
   * Generate Beta distribution sample using inverse transform sampling
   */
  static sampleBeta(alpha: number, beta: number): number {
    // Use approximate method for computational efficiency
    if (alpha === 1 && beta === 1) {
      return Math.random()
    }
    
    // Approximate beta sampling using gamma distributions
    const gammaA = this.sampleGamma(alpha)
    const gammaB = this.sampleGamma(beta)
    
    return gammaA / (gammaA + gammaB)
  }
  
  /**
   * Generate Gamma distribution sample using Marsaglia and Tsang method
   */
  static sampleGamma(alpha: number): number {
    if (alpha < 1) {
      return this.sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha)
    }
    
    const d = alpha - 1/3
    const c = 1 / Math.sqrt(9 * d)
    
    while (true) {
      let x: number
      let v: number
      
      do {
        x = this.sampleNormal()
        v = 1 + c * x
      } while (v <= 0)
      
      v = v * v * v
      const u = Math.random()
      
      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v
      }
      
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v
      }
    }
  }
  
  /**
   * Generate standard normal distribution sample using Box-Muller transform
   */
  static sampleNormal(): number {
    // Use cached value if available
    if (this._cachedNormal !== null) {
      const cached = this._cachedNormal
      this._cachedNormal = null
      return cached
    }
    
    const u1 = Math.random()
    const u2 = Math.random()
    
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
    
    this._cachedNormal = z1
    return z0
  }
  
  private static _cachedNormal: number | null = null
  
  /**
   * Calculate contextual reward for an arm given features
   */
  static calculateContextualReward(
    arm: BanditArm,
    features: ContextualFeatures,
    config: BanditConfig
  ): number {
    const { userMastery, fatigueLevel, previousPerformance, sessionGoal } = features
    const { zpdMinSuccess, zpdMaxSuccess, engagementWeight, difficultyWeight } = config
    
    // Base reward: how well does this item match user's current ability?
    const difficultyMatch = this.calculateDifficultyMatch(arm.difficulty, userMastery)
    
    // ZPD reward: maintain success rate in optimal learning zone
    const zpdReward = this.calculateZPDReward(difficultyMatch, zpdMinSuccess, zpdMaxSuccess)
    
    // Engagement reward: prefer items that maintain engagement
    const engagementReward = (arm.engagement || 0.5) * engagementWeight
    
    // Difficulty progression reward: gradually increase difficulty
    const progressionReward = this.calculateProgressionReward(
      arm.difficulty, 
      userMastery,
      previousPerformance
    ) * difficultyWeight
    
    // Fatigue adjustment: easier items when fatigued
    const fatigueAdjustment = fatigueLevel > 0.7 ? 0.8 : 1.0
    
    // Session goal alignment
    const goalAlignment = this.calculateGoalAlignment(arm, sessionGoal)
    
    // Time of day adjustment
    const timeAdjustment = this.calculateTimeAdjustment(features.timeOfDay)
    
    // Combine all factors
    const totalReward = (
      zpdReward * 0.4 +
      engagementReward * 0.2 +
      progressionReward * 0.2 +
      goalAlignment * 0.1 +
      timeAdjustment * 0.1
    ) * fatigueAdjustment
    
    return Math.max(0, Math.min(1, totalReward))
  }
  
  /**
   * Calculate how well item difficulty matches user mastery
   */
  static calculateDifficultyMatch(itemDifficulty: number, userMastery: number): number {
    // Optimal difficulty is slightly above user's current mastery
    const optimalDifficulty = userMastery + 0.1
    const difference = Math.abs(itemDifficulty - optimalDifficulty)
    
    // Use Gaussian-like function for smooth matching
    return Math.exp(-2 * difference * difference)
  }
  
  /**
   * Calculate Zone of Proximal Development reward
   */
  static calculateZPDReward(
    difficultyMatch: number, 
    minSuccess: number, 
    maxSuccess: number
  ): number {
    // Estimate success probability based on difficulty match
    const successProb = difficultyMatch * 0.6 + 0.2 // Scale to reasonable range
    
    if (successProb >= minSuccess && successProb <= maxSuccess) {
      return 1.0 // Perfect ZPD
    } else if (successProb < minSuccess) {
      // Too difficult
      return successProb / minSuccess
    } else {
      // Too easy
      return (1 - successProb) / (1 - maxSuccess)
    }
  }
  
  /**
   * Calculate progression reward for gradual difficulty increase
   */
  static calculateProgressionReward(
    itemDifficulty: number,
    userMastery: number,
    previousPerformance: number
  ): number {
    if (previousPerformance > 0.8) {
      // User is doing well, can handle slightly harder items
      const idealDifficulty = userMastery + 0.15
      return itemDifficulty >= idealDifficulty ? 1.0 : 0.5
    } else if (previousPerformance < 0.6) {
      // User struggling, need easier items
      const idealDifficulty = userMastery - 0.1
      return itemDifficulty <= idealDifficulty ? 1.0 : 0.3
    } else {
      // Maintain current level
      return this.calculateDifficultyMatch(itemDifficulty, userMastery)
    }
  }
  
  /**
   * Calculate goal alignment reward
   */
  static calculateGoalAlignment(arm: BanditArm, sessionGoal: string): number {
    // Simple keyword matching - could be enhanced with NLP
    if (sessionGoal.includes('review') || sessionGoal.includes('practice')) {
      return arm.difficulty < 0.7 ? 1.0 : 0.5
    } else if (sessionGoal.includes('challenge') || sessionGoal.includes('test')) {
      return arm.difficulty > 0.6 ? 1.0 : 0.5
    } else if (sessionGoal.includes('learn') || sessionGoal.includes('new')) {
      return arm.difficulty >= 0.4 && arm.difficulty <= 0.8 ? 1.0 : 0.7
    }
    return 0.8 // Neutral
  }
  
  /**
   * Calculate time of day adjustment
   */
  static calculateTimeAdjustment(timeOfDay: string): number {
    const hour = parseInt(timeOfDay.split(':')[0])
    
    // Morning: peak performance
    if (hour >= 9 && hour <= 11) return 1.1
    // Afternoon: good performance
    if (hour >= 14 && hour <= 16) return 1.0
    // Evening: slightly reduced
    if (hour >= 18 && hour <= 20) return 0.9
    // Late night/early morning: reduced
    return 0.8
  }
  
  /**
   * Thompson Sampling selection with contextual features
   */
  static selectArm(
    arms: BanditArm[],
    stats: Map<string, BanditArmStats>,
    features: ContextualFeatures,
    config: BanditConfig
  ): { selectedArm: BanditArm; expectedReward: number; sampledValue: number } {
    const armScores: Array<{
      arm: BanditArm
      score: number
      contextualReward: number
      sampledValue: number
    }> = []
    
    for (const arm of arms) {
      const armStats = stats.get(arm.id) || {
        alphaSuccess: 1,
        betaFailure: 1,
        totalPulls: 0,
        totalRewards: 0,
        avgReward: 0
      }
      
      // Calculate contextual reward
      const contextualReward = this.calculateContextualReward(arm, features, config)
      
      // Thompson sampling: sample from Beta distribution
      const sampledValue = this.sampleBeta(armStats.alphaSuccess, armStats.betaFailure)
      
      // Combine sampled value with contextual reward
      const explorationBonus = config.explorationRate / Math.sqrt(armStats.totalPulls + 1)
      const score = (sampledValue * 0.6 + contextualReward * 0.4) + explorationBonus
      
      // Apply freshness bonus for items not pulled recently
      let freshnessBonus = 0
      if (armStats.lastPulled) {
        const hoursSinceLastPull = (Date.now() - armStats.lastPulled.getTime()) / (1000 * 60 * 60)
        freshnessBonus = Math.min(config.freshnessWeight, hoursSinceLastPull / 24)
      } else {
        freshnessBonus = config.freshnessWeight
      }
      
      const finalScore = score + freshnessBonus
      
      armScores.push({
        arm,
        score: finalScore,
        contextualReward,
        sampledValue
      })
    }
    
    // Select arm with highest score
    armScores.sort((a, b) => b.score - a.score)
    const selected = armScores[0]
    
    return {
      selectedArm: selected.arm,
      expectedReward: selected.contextualReward,
      sampledValue: selected.sampledValue
    }
  }
  
  /**
   * Update arm statistics after observing reward
   */
  static updateArmStats(
    armId: string,
    reward: number,
    stats: Map<string, BanditArmStats>
  ): BanditArmStats {
    const currentStats = stats.get(armId) || {
      alphaSuccess: 1,
      betaFailure: 1,
      totalPulls: 0,
      totalRewards: 0,
      avgReward: 0
    }
    
    const newStats: BanditArmStats = {
      alphaSuccess: currentStats.alphaSuccess + reward,
      betaFailure: currentStats.betaFailure + (1 - reward),
      totalPulls: currentStats.totalPulls + 1,
      totalRewards: currentStats.totalRewards + reward,
      avgReward: (currentStats.totalRewards + reward) / (currentStats.totalPulls + 1),
      lastPulled: new Date()
    }
    
    stats.set(armId, newStats)
    return newStats
  }
  
  /**
   * Calculate regret: difference between optimal and achieved reward
   */
  static calculateRegret(
    optimalReward: number,
    actualReward: number
  ): number {
    return Math.max(0, optimalReward - actualReward)
  }
  
  /**
   * Get exploration vs exploitation ratio
   */
  static getExplorationRatio(
    stats: Map<string, BanditArmStats>
  ): { exploration: number; exploitation: number } {
    const allStats = Array.from(stats.values())
    if (allStats.length === 0) return { exploration: 1, exploitation: 0 }
    
    const totalPulls = allStats.reduce((sum, s) => sum + s.totalPulls, 0)
    if (totalPulls === 0) return { exploration: 1, exploitation: 0 }
    
    // Find most pulled arm
    const maxPulls = Math.max(...allStats.map(s => s.totalPulls))
    const exploitationPulls = allStats.find(s => s.totalPulls === maxPulls)?.totalPulls || 0
    const explorationPulls = totalPulls - exploitationPulls
    
    return {
      exploration: explorationPulls / totalPulls,
      exploitation: exploitationPulls / totalPulls
    }
  }
  
  /**
   * Detect and handle concept drift
   */
  static detectConceptDrift(
    stats: Map<string, BanditArmStats>,
    windowSize: number = 100
  ): boolean {
    // Simple implementation: check if performance has degraded significantly
    for (const [armId, armStats] of stats) {
      if (armStats.totalPulls < windowSize * 2) continue
      
      // Compare recent performance to overall average
      const recentPerformance = armStats.avgReward
      // This would need historical data in a real implementation
      
      // For now, just check if performance is unusually low
      if (recentPerformance < 0.3 && armStats.totalPulls > windowSize) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Reset bandit statistics (for concept drift or new contexts)
   */
  static resetBanditStats(
    stats: Map<string, BanditArmStats>,
    decayFactor: number = 0.5
  ): void {
    for (const [armId, armStats] of stats) {
      const decayedStats: BanditArmStats = {
        alphaSuccess: armStats.alphaSuccess * decayFactor + 1,
        betaFailure: armStats.betaFailure * decayFactor + 1,
        totalPulls: Math.floor(armStats.totalPulls * decayFactor),
        totalRewards: armStats.totalRewards * decayFactor,
        avgReward: armStats.avgReward, // Keep average as is
        lastPulled: armStats.lastPulled
      }
      
      stats.set(armId, decayedStats)
    }
  }
}

// Legacy function for backward compatibility
export function selectNextItem(candidates: Array<{ id: string; score: number }>): { id: string; score: number } {
  if (candidates.length === 0) {
    throw new Error('No candidates provided')
  }
  
  // Simple random selection weighted by scores
  const totalScore = candidates.reduce((sum, c) => sum + c.score, 0)
  const random = Math.random() * totalScore
  
  let accumulated = 0
  for (const candidate of candidates) {
    accumulated += candidate.score
    if (random <= accumulated) {
      return candidate
    }
  }
  
  // Fallback to highest scoring candidate
  return candidates.reduce((best, current) => 
    current.score > best.score ? current : best
  )
}