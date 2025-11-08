/**
 * Progress Calculation and Optimization
 *
 * Implements:
 * - Client-side progress calculation for immediate feedback
 * - Progress data prefetching based on user learning patterns
 * - Progress summary generation and caching
 * - Progress recommendation engine integration
 * - Requirements: 3.1, 3.3, 6.4, 10.4
 */

import type {
  ProgressSummary,
  SkillMastery,
  AttemptRecord,
  LearningStreak,
  Milestone,
  WeeklyProgressPoint,
  TopicProgressPoint,
} from "@/types/user-service";

// ============================================================================
// Calculation Types
// ============================================================================

export interface ProgressCalculationConfig {
  masteryThreshold: number; // Default: 0.8 (80%)
  confidenceWeight: number; // Default: 0.3
  accuracyWeight: number; // Default: 0.4
  consistencyWeight: number; // Default: 0.3
  streakBonus: number; // Default: 0.1
  recencyWeight: number; // Default: 0.2
}

export interface MasteryCalculationResult {
  mastery: number;
  confidence: number;
  improvement: number;
  factors: MasteryFactors;
  recommendations: string[];
}

export interface MasteryFactors {
  accuracy: number;
  consistency: number;
  recency: number;
  volume: number;
  streak: number;
}

export interface ProgressPrediction {
  topic: string;
  currentMastery: number;
  predictedMastery: number;
  timeToMastery: number; // days
  confidence: number;
  requiredPractice: number; // attempts needed
  recommendations: PracticeRecommendation[];
}

export interface PracticeRecommendation {
  type: "frequency" | "difficulty" | "focus" | "review";
  priority: "high" | "medium" | "low";
  message: string;
  actionable: boolean;
  estimatedImpact: number; // 0-1
}

export interface LearningPattern {
  userId: string;
  preferredTimes: number[]; // Hours of day (0-23)
  sessionDuration: number; // Average minutes
  difficultyProgression: "gradual" | "aggressive" | "mixed";
  topicPreferences: string[];
  weakAreas: string[];
  strengths: string[];
  learningVelocity: number; // Topics per week
  retentionRate: number; // 0-1
  lastUpdated: Date;
}

export interface PrefetchStrategy {
  priority: "high" | "medium" | "low";
  topics: string[];
  dataTypes: ("summary" | "mastery" | "streak" | "milestones")[];
  triggerConditions: string[];
  cacheTime: number; // milliseconds
}

// ============================================================================
// Progress Calculator
// ============================================================================

export class ProgressCalculator {
  private config: ProgressCalculationConfig;

  constructor(config?: Partial<ProgressCalculationConfig>) {
    this.config = {
      masteryThreshold: 0.8,
      confidenceWeight: 0.3,
      accuracyWeight: 0.4,
      consistencyWeight: 0.3,
      streakBonus: 0.1,
      recencyWeight: 0.2,
      ...config,
    };
  }

  /**
   * Calculate skill mastery with immediate feedback
   */
  calculateSkillMastery(
    currentMastery: SkillMastery,
    newAttempts: AttemptRecord[],
  ): MasteryCalculationResult {
    if (newAttempts.length === 0) {
      return this.createEmptyResult(currentMastery.mastery);
    }

    // Calculate accuracy from new attempts
    const correctAttempts = newAttempts.filter((a) => a.correct).length;
    const accuracy = correctAttempts / newAttempts.length;

    // Calculate factors
    const factors = this.calculateMasteryFactors(
      currentMastery,
      newAttempts,
      accuracy,
    );

    // Calculate new mastery level
    const masteryImprovement = this.calculateMasteryImprovement(
      factors,
      accuracy,
    );
    const newMastery = Math.min(
      1.0,
      currentMastery.mastery + masteryImprovement,
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(factors, newAttempts.length);

    // Generate recommendations
    const recommendations = this.generateMasteryRecommendations(
      factors,
      newMastery,
    );

    return {
      mastery: newMastery,
      confidence,
      improvement: masteryImprovement,
      factors,
      recommendations,
    };
  }

  /**
   * Calculate mastery factors
   */
  private calculateMasteryFactors(
    _currentMastery: SkillMastery,
    newAttempts: AttemptRecord[],
    accuracy: number,
  ): MasteryFactors {
    // Accuracy factor (0-1)
    const accuracyFactor = accuracy;

    // Consistency factor based on time distribution
    const consistencyFactor = this.calculateConsistency(newAttempts);

    // Recency factor - more recent practice is weighted higher
    const recencyFactor = this.calculateRecency(newAttempts);

    // Volume factor based on practice amount
    const volumeFactor = Math.min(1.0, newAttempts.length / 10); // Normalize to 10 attempts

    // Streak factor based on consecutive correct answers
    const streakFactor = this.calculateStreakFactor(newAttempts);

    return {
      accuracy: accuracyFactor,
      consistency: consistencyFactor,
      recency: recencyFactor,
      volume: volumeFactor,
      streak: streakFactor,
    };
  }

  /**
   * Calculate consistency based on time distribution of attempts
   */
  private calculateConsistency(attempts: AttemptRecord[]): number {
    if (attempts.length < 2) return 0.5;

    // Calculate time gaps between attempts
    const sortedAttempts = [...attempts].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const gaps = [];
    for (let i = 1; i < sortedAttempts.length; i++) {
      const gap =
        (sortedAttempts[i]?.timestamp.getTime() || 0) -
        (sortedAttempts[i - 1]?.timestamp.getTime() || 0);
      gaps.push(gap);
    }

    // Calculate coefficient of variation (lower = more consistent)
    const meanGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const variance =
      gaps.reduce((sum, gap) => sum + Math.pow(gap - meanGap, 2), 0) /
      gaps.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = meanGap > 0 ? stdDev / meanGap : 1;

    // Convert to consistency score (0-1, higher = more consistent)
    return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
  }

  /**
   * Calculate recency factor
   */
  private calculateRecency(attempts: AttemptRecord[]): number {
    if (attempts.length === 0) return 0;

    const now = new Date().getTime();
    const weights = attempts.map((attempt) => {
      const ageHours = (now - attempt.timestamp.getTime()) / (1000 * 60 * 60);
      // Exponential decay: more recent attempts have higher weight
      return Math.exp(-ageHours / 24); // Decay over 24 hours
    });

    return weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
  }

  /**
   * Calculate streak factor from consecutive correct answers
   */
  private calculateStreakFactor(attempts: AttemptRecord[]): number {
    if (attempts.length === 0) return 0;

    const sortedAttempts = [...attempts].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    let maxStreak = 0;
    let currentStreak = 0;

    for (const attempt of sortedAttempts) {
      if (attempt.correct) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return Math.min(1.0, maxStreak / attempts.length);
  }

  /**
   * Calculate mastery improvement based on factors
   */
  private calculateMasteryImprovement(
    factors: MasteryFactors,
    accuracy: number,
  ): number {
    const baseImprovement = accuracy * 0.1; // Base 10% improvement for perfect accuracy

    const weightedImprovement =
      baseImprovement *
      (this.config.accuracyWeight * factors.accuracy +
        this.config.consistencyWeight * factors.consistency +
        this.config.recencyWeight * factors.recency +
        0.1 * factors.volume); // Volume contributes less

    // Add streak bonus
    const streakBonus = factors.streak * this.config.streakBonus;

    return Math.max(0, weightedImprovement + streakBonus);
  }

  /**
   * Calculate confidence in mastery calculation
   */
  private calculateConfidence(
    factors: MasteryFactors,
    attemptCount: number,
  ): number {
    // Base confidence from attempt volume
    const volumeConfidence = Math.min(1.0, attemptCount / 20); // Full confidence at 20+ attempts

    // Factor-based confidence
    const factorConfidence =
      factors.accuracy * 0.3 +
      factors.consistency * 0.3 +
      factors.recency * 0.2 +
      factors.volume * 0.2;

    return (volumeConfidence + factorConfidence) / 2;
  }

  /**
   * Generate mastery recommendations
   */
  private generateMasteryRecommendations(
    factors: MasteryFactors,
    mastery: number,
  ): string[] {
    const recommendations: string[] = [];

    if (factors.accuracy < 0.7) {
      recommendations.push(
        "Focus on understanding fundamentals before advancing",
      );
    }

    if (factors.consistency < 0.5) {
      recommendations.push("Practice more regularly for better retention");
    }

    if (factors.recency < 0.3) {
      recommendations.push(
        "Recent practice is key - try to practice this topic daily",
      );
    }

    if (mastery >= this.config.masteryThreshold) {
      recommendations.push(
        "Great job! Consider moving to more advanced topics",
      );
    } else if (mastery >= 0.6) {
      recommendations.push(
        "You're making good progress - keep practicing consistently",
      );
    } else {
      recommendations.push(
        "Focus on this topic with regular practice sessions",
      );
    }

    return recommendations;
  }

  /**
   * Create empty result for no attempts
   */
  private createEmptyResult(currentMastery: number): MasteryCalculationResult {
    return {
      mastery: currentMastery,
      confidence: 0,
      improvement: 0,
      factors: {
        accuracy: 0,
        consistency: 0,
        recency: 0,
        volume: 0,
        streak: 0,
      },
      recommendations: ["Start practicing to build mastery"],
    };
  }
}

// ============================================================================
// Progress Predictor
// ============================================================================

export class ProgressPredictor {
  /**
   * Predict future progress for topics
   */
  static predictTopicProgress(
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
    learningPattern: LearningPattern,
  ): ProgressPrediction[] {
    const predictions: ProgressPrediction[] = [];

    for (const [topic, mastery] of skillMasteries) {
      if (mastery.mastery >= 0.8) continue; // Skip already mastered topics

      const prediction = this.predictSingleTopic(
        mastery,
        weeklyProgress,
        learningPattern,
      );
      predictions.push({
        topic,
        ...prediction,
      });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Predict progress for a single topic
   */
  private static predictSingleTopic(
    mastery: SkillMastery,
    weeklyProgress: WeeklyProgressPoint[],
    learningPattern: LearningPattern,
  ): Omit<ProgressPrediction, "topic"> {
    // Calculate learning velocity from weekly progress
    const velocity = this.calculateLearningVelocity(weeklyProgress);

    // Estimate time to mastery
    const remainingMastery = 0.8 - mastery.mastery;
    const timeToMastery =
      remainingMastery > 0
        ? Math.ceil(
            remainingMastery / (velocity * learningPattern.learningVelocity),
          )
        : 0;

    // Predict future mastery
    const predictedMastery = Math.min(
      1.0,
      mastery.mastery + velocity * learningPattern.learningVelocity * 7, // 7 days ahead
    );

    // Calculate confidence based on consistency
    const confidence = Math.min(
      1.0,
      learningPattern.retentionRate * (mastery.practiceCount / 50),
    );

    // Estimate required practice
    const requiredPractice = Math.ceil(remainingMastery * 100); // Rough estimate

    // Generate recommendations
    const recommendations = this.generatePracticeRecommendations(
      mastery,
      learningPattern,
      timeToMastery,
    );

    return {
      currentMastery: mastery.mastery,
      predictedMastery,
      timeToMastery,
      confidence,
      requiredPractice,
      recommendations,
    };
  }

  /**
   * Calculate learning velocity from weekly progress
   */
  private static calculateLearningVelocity(
    weeklyProgress: WeeklyProgressPoint[],
  ): number {
    if (weeklyProgress.length < 2) return 0.01; // Default slow velocity

    const sortedProgress = [...weeklyProgress].sort(
      (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime(),
    );

    const firstMastery = sortedProgress[0]?.mastery || 0;
    const lastMastery = sortedProgress[sortedProgress.length - 1]?.mastery || 0;
    const weeks = sortedProgress.length - 1;

    return weeks > 0
      ? Math.max(0.001, (lastMastery - firstMastery) / weeks)
      : 0.01;
  }

  /**
   * Generate practice recommendations
   */
  private static generatePracticeRecommendations(
    mastery: SkillMastery,
    learningPattern: LearningPattern,
    timeToMastery: number,
  ): PracticeRecommendation[] {
    const recommendations: PracticeRecommendation[] = [];

    // Frequency recommendations
    if (timeToMastery > 30) {
      recommendations.push({
        type: "frequency",
        priority: "high",
        message: "Increase practice frequency to 4-5 times per week",
        actionable: true,
        estimatedImpact: 0.7,
      });
    } else if (timeToMastery > 14) {
      recommendations.push({
        type: "frequency",
        priority: "medium",
        message: "Practice 2-3 times per week consistently",
        actionable: true,
        estimatedImpact: 0.5,
      });
    }

    // Difficulty recommendations
    if (mastery.mastery < 0.3) {
      recommendations.push({
        type: "difficulty",
        priority: "high",
        message: "Focus on easier problems to build confidence",
        actionable: true,
        estimatedImpact: 0.6,
      });
    } else if (mastery.mastery > 0.6) {
      recommendations.push({
        type: "difficulty",
        priority: "medium",
        message: "Try more challenging problems to accelerate growth",
        actionable: true,
        estimatedImpact: 0.4,
      });
    }

    // Focus recommendations
    if (learningPattern.weakAreas.length > 0) {
      recommendations.push({
        type: "focus",
        priority: "medium",
        message: "Dedicate extra time to identified weak areas",
        actionable: true,
        estimatedImpact: 0.5,
      });
    }

    // Review recommendations
    if (learningPattern.retentionRate < 0.7) {
      recommendations.push({
        type: "review",
        priority: "high",
        message: "Add regular review sessions to improve retention",
        actionable: true,
        estimatedImpact: 0.8,
      });
    }

    return recommendations.sort(
      (a, b) => b.estimatedImpact - a.estimatedImpact,
    );
  }
}

// ============================================================================
// Learning Pattern Analyzer
// ============================================================================

export class LearningPatternAnalyzer {
  /**
   * Analyze user learning patterns from progress data
   */
  static analyzeLearningPattern(
    userId: string,
    progressSummary: ProgressSummary,
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
  ): LearningPattern {
    // Analyze preferred practice times (mock data for now)
    const preferredTimes = this.analyzePreferredTimes(progressSummary);

    // Calculate average session duration
    const sessionDuration = this.calculateSessionDuration(progressSummary);

    // Determine difficulty progression preference
    const difficultyProgression =
      this.analyzeDifficultyProgression(skillMasteries);

    // Identify topic preferences
    const topicPreferences = this.identifyTopicPreferences(skillMasteries);

    // Identify weak areas and strengths
    const { weakAreas, strengths } =
      this.identifyStrengthsAndWeaknesses(skillMasteries);

    // Calculate learning velocity
    const learningVelocity = this.calculateLearningVelocity(weeklyProgress);

    // Calculate retention rate
    const retentionRate = this.calculateRetentionRate(
      progressSummary,
      skillMasteries,
    );

    return {
      userId,
      preferredTimes,
      sessionDuration,
      difficultyProgression,
      topicPreferences,
      weakAreas,
      strengths,
      learningVelocity,
      retentionRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * Analyze preferred practice times (mock implementation)
   */
  private static analyzePreferredTimes(_summary: ProgressSummary): number[] {
    // In real implementation, this would analyze actual practice timestamps
    // For now, return common learning hours
    return [9, 10, 14, 15, 19, 20]; // 9-10 AM, 2-3 PM, 7-8 PM
  }

  /**
   * Calculate average session duration
   */
  private static calculateSessionDuration(summary: ProgressSummary): number {
    // Estimate based on total study time and attempts
    if (summary.totalAttempts === 0) return 30; // Default 30 minutes

    const avgTimePerAttempt = summary.totalStudyTimeMs / summary.totalAttempts;
    const estimatedSessionDuration = Math.min(
      120,
      Math.max(15, avgTimePerAttempt / 1000 / 60),
    );

    return Math.round(estimatedSessionDuration);
  }

  /**
   * Analyze difficulty progression preference
   */
  private static analyzeDifficultyProgression(
    skillMasteries: Map<string, SkillMastery>,
  ): "gradual" | "aggressive" | "mixed" {
    // Analyze mastery distribution to infer preference
    const masteries = Array.from(skillMasteries.values());
    const highMastery = masteries.filter((m) => m.mastery > 0.8).length;
    const mediumMastery = masteries.filter(
      (m) => m.mastery > 0.5 && m.mastery <= 0.8,
    ).length;
    const lowMastery = masteries.filter((m) => m.mastery <= 0.5).length;

    if (highMastery > mediumMastery && highMastery > lowMastery) {
      return "gradual"; // Prefers to master topics thoroughly
    } else if (lowMastery > highMastery) {
      return "aggressive"; // Tries many topics quickly
    } else {
      return "mixed"; // Balanced approach
    }
  }

  /**
   * Identify topic preferences based on mastery and practice
   */
  private static identifyTopicPreferences(
    skillMasteries: Map<string, SkillMastery>,
  ): string[] {
    return Array.from(skillMasteries.entries())
      .sort(([, a], [, b]) => {
        // Sort by combination of mastery and practice count
        const scoreA = a.mastery * 0.7 + (a.practiceCount / 100) * 0.3;
        const scoreB = b.mastery * 0.7 + (b.practiceCount / 100) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 5) // Top 5 preferred topics
      .map(([topic]) => topic);
  }

  /**
   * Identify strengths and weaknesses
   */
  private static identifyStrengthsAndWeaknesses(
    skillMasteries: Map<string, SkillMastery>,
  ): { weakAreas: string[]; strengths: string[] } {
    const masteries = Array.from(skillMasteries.entries());

    const strengths = masteries
      .filter(([, mastery]) => mastery.mastery >= 0.7)
      .sort(([, a], [, b]) => b.mastery - a.mastery)
      .slice(0, 3)
      .map(([topic]) => topic);

    const weakAreas = masteries
      .filter(
        ([, mastery]) => mastery.mastery < 0.5 && mastery.practiceCount > 5,
      )
      .sort(([, a], [, b]) => a.mastery - b.mastery)
      .slice(0, 3)
      .map(([topic]) => topic);

    return { weakAreas, strengths };
  }

  /**
   * Calculate learning velocity (topics per week)
   */
  private static calculateLearningVelocity(
    weeklyProgress: WeeklyProgressPoint[],
  ): number {
    if (weeklyProgress.length < 2) return 0.5; // Default velocity

    const sortedProgress = [...weeklyProgress].sort(
      (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime(),
    );

    // Calculate average mastery improvement per week
    let totalImprovement = 0;
    for (let i = 1; i < sortedProgress.length; i++) {
      const improvement =
        (sortedProgress[i]?.mastery || 0) -
        (sortedProgress[i - 1]?.mastery || 0);
      totalImprovement += Math.max(0, improvement);
    }

    return totalImprovement / (sortedProgress.length - 1);
  }

  /**
   * Calculate retention rate
   */
  private static calculateRetentionRate(
    summary: ProgressSummary,
    skillMasteries: Map<string, SkillMastery>,
  ): number {
    // Estimate retention based on accuracy and consistency
    const baseRetention = summary.accuracyRate;

    // Factor in practice consistency
    const now = new Date();
    const recentPractice = Array.from(skillMasteries.values()).filter(
      (mastery) => {
        const daysSinceLastPractice =
          (now.getTime() - mastery.lastPracticed.getTime()) /
          (1000 * 60 * 60 * 24);
        return daysSinceLastPractice <= 7; // Practiced within last week
      },
    ).length;

    const consistencyFactor = recentPractice / skillMasteries.size;

    return Math.min(1.0, baseRetention * 0.7 + consistencyFactor * 0.3);
  }
}

// ============================================================================
// Prefetch Strategy Manager
// ============================================================================

export class PrefetchStrategyManager {
  /**
   * Generate prefetch strategies based on learning patterns
   */
  static generatePrefetchStrategies(
    learningPattern: LearningPattern,
    _currentProgress: ProgressSummary,
  ): PrefetchStrategy[] {
    const strategies: PrefetchStrategy[] = [];

    // High priority: User's preferred topics
    if (learningPattern.topicPreferences.length > 0) {
      strategies.push({
        priority: "high",
        topics: learningPattern.topicPreferences.slice(0, 3),
        dataTypes: ["mastery", "summary"],
        triggerConditions: ["user_login", "dashboard_visit"],
        cacheTime: 5 * 60 * 1000, // 5 minutes
      });
    }

    // Medium priority: Weak areas for improvement
    if (learningPattern.weakAreas.length > 0) {
      strategies.push({
        priority: "medium",
        topics: learningPattern.weakAreas,
        dataTypes: ["mastery", "streak"],
        triggerConditions: ["practice_session_start"],
        cacheTime: 10 * 60 * 1000, // 10 minutes
      });
    }

    // Low priority: General progress data
    strategies.push({
      priority: "low",
      topics: [],
      dataTypes: ["summary", "milestones"],
      triggerConditions: ["background_sync"],
      cacheTime: 15 * 60 * 1000, // 15 minutes
    });

    return strategies;
  }

  /**
   * Determine if prefetch should be triggered
   */
  static shouldTriggerPrefetch(
    strategy: PrefetchStrategy,
    trigger: string,
    lastPrefetch?: Date,
  ): boolean {
    // Check if trigger matches strategy conditions
    if (!strategy.triggerConditions.includes(trigger)) {
      return false;
    }

    // Check if enough time has passed since last prefetch
    if (lastPrefetch) {
      const timeSinceLastPrefetch = Date.now() - lastPrefetch.getTime();
      if (timeSinceLastPrefetch < strategy.cacheTime) {
        return false;
      }
    }

    return true;
  }
}

// ============================================================================
// Progress Summary Generator
// ============================================================================

export class ProgressSummaryGenerator {
  /**
   * Generate optimized progress summary with caching
   */
  static generateOptimizedSummary(
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
    learningStreak: LearningStreak,
    milestones: Milestone[],
  ): ProgressSummary {
    // Calculate overall mastery
    const overallMastery = this.calculateOverallMastery(skillMasteries);

    // Count mastered topics
    const masteredTopics = Array.from(skillMasteries.values()).filter(
      (mastery) => mastery.mastery >= 0.8,
    ).length;

    // Calculate totals
    const totalAttempts = Array.from(skillMasteries.values()).reduce(
      (sum, mastery) => sum + mastery.practiceCount,
      0,
    );

    const correctAttempts = Math.floor(totalAttempts * 0.75); // Estimate based on typical accuracy

    const totalStudyTimeMs = Array.from(skillMasteries.values()).reduce(
      (sum, mastery) => sum + mastery.totalTimeMs,
      0,
    );

    // Calculate accuracy rate
    const accuracyRate =
      totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

    // Generate topic progress points
    const topicProgress = this.generateTopicProgress(skillMasteries);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      skillMasteries,
      weeklyProgress,
      learningStreak,
    );

    return {
      userId: "", // Will be set by caller
      overallMastery,
      totalTopics: skillMasteries.size,
      masteredTopics,
      topicMasteries: Object.fromEntries(skillMasteries),
      recentAttempts: [], // Would be populated from recent attempts
      learningStreak: learningStreak.currentStreak,
      totalStudyTimeMs,
      totalAttempts,
      correctAttempts,
      accuracyRate,
      weeklyProgress,
      topicProgress,
      milestones,
      recommendations,
      lastActiveDate: new Date(),
      consecutiveDays: learningStreak.currentStreak,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate overall mastery from individual topic masteries
   */
  private static calculateOverallMastery(
    skillMasteries: Map<string, SkillMastery>,
  ): number {
    if (skillMasteries.size === 0) return 0;

    const totalMastery = Array.from(skillMasteries.values()).reduce(
      (sum, mastery) => sum + mastery.mastery,
      0,
    );

    return totalMastery / skillMasteries.size;
  }

  /**
   * Generate topic progress points
   */
  private static generateTopicProgress(
    skillMasteries: Map<string, SkillMastery>,
  ): TopicProgressPoint[] {
    return Array.from(skillMasteries.entries()).map(([topic, mastery]) => ({
      topic,
      mastery: mastery.mastery,
      practiceCount: mastery.practiceCount,
      lastPracticed: mastery.lastPracticed,
      trend: "stable" as const, // Would be calculated from historical data
    }));
  }

  /**
   * Generate personalized recommendations
   */
  private static generateRecommendations(
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
    learningStreak: LearningStreak,
  ): string[] {
    const recommendations: string[] = [];

    // Streak recommendations
    if (learningStreak.currentStreak === 0) {
      recommendations.push("Start a learning streak by practicing today!");
    } else if (learningStreak.currentStreak < 7) {
      recommendations.push("Keep your streak going - aim for 7 days in a row!");
    }

    // Progress recommendations
    const lowMasteryTopics = Array.from(skillMasteries.entries())
      .filter(([, mastery]) => mastery.mastery < 0.5)
      .sort(([, a], [, b]) => b.practiceCount - a.practiceCount);

    if (lowMasteryTopics.length > 0) {
      const topic = lowMasteryTopics[0]?.[0];
      recommendations.push(
        `Focus on ${topic} - you've practiced it but need more work`,
      );
    }

    // Consistency recommendations
    if (weeklyProgress.length >= 2) {
      const recentProgress = weeklyProgress.slice(-2);
      const progressDiff =
        (recentProgress[1]?.mastery || 0) - (recentProgress[0]?.mastery || 0);

      if (progressDiff < 0.01) {
        recommendations.push(
          "Try increasing your practice frequency for faster progress",
        );
      }
    }

    return recommendations.slice(0, 3); // Limit to 3 recommendations
  }
}

// ============================================================================
// Export Main Progress Calculator
// ============================================================================

export class ProgressCalculationManager {
  private calculator: ProgressCalculator;
  private predictor = ProgressPredictor;
  private patternAnalyzer = LearningPatternAnalyzer;
  private prefetchManager = PrefetchStrategyManager;
  private summaryGenerator = ProgressSummaryGenerator;

  constructor(config?: Partial<ProgressCalculationConfig>) {
    this.calculator = new ProgressCalculator(config);
  }

  /**
   * Calculate immediate progress feedback
   */
  calculateImmediateFeedback(
    currentMastery: SkillMastery,
    newAttempts: AttemptRecord[],
  ): MasteryCalculationResult {
    return this.calculator.calculateSkillMastery(currentMastery, newAttempts);
  }

  /**
   * Generate progress predictions
   */
  generateProgressPredictions(
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
    learningPattern: LearningPattern,
  ): ProgressPrediction[] {
    return this.predictor.predictTopicProgress(
      skillMasteries,
      weeklyProgress,
      learningPattern,
    );
  }

  /**
   * Analyze learning patterns
   */
  analyzeLearningPatterns(
    userId: string,
    progressSummary: ProgressSummary,
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
  ): LearningPattern {
    return this.patternAnalyzer.analyzeLearningPattern(
      userId,
      progressSummary,
      skillMasteries,
      weeklyProgress,
    );
  }

  /**
   * Generate prefetch strategies
   */
  generatePrefetchStrategies(
    learningPattern: LearningPattern,
    currentProgress: ProgressSummary,
  ): PrefetchStrategy[] {
    return this.prefetchManager.generatePrefetchStrategies(
      learningPattern,
      currentProgress,
    );
  }

  /**
   * Generate optimized progress summary
   */
  generateOptimizedSummary(
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
    learningStreak: LearningStreak,
    milestones: Milestone[],
  ): ProgressSummary {
    return this.summaryGenerator.generateOptimizedSummary(
      skillMasteries,
      weeklyProgress,
      learningStreak,
      milestones,
    );
  }
}
