/**
 * Activity Analytics and Insights Utilities
 *
 * Implements:
 * - Engagement metrics calculation and trend analysis
 * - Behavioral pattern detection and analysis
 * - Personalized insight generation from activity data
 * - Activity recommendation engine with machine learning integration
 * - Requirements: 4.2, 4.3, 4.4, 10.5
 */

import type {
  ActivityRecord,
  ActivitySummary,
  EngagementMetrics,
  ActivityInsight,
  ActivityRecommendation,
  BehaviorPattern,
  ActivityType,
  DateRange,
} from "@/types/user-service";

import type {
  EngagementTrend,
  ActivityReport,
  UsageAnalytics,
  ActivitySession,
} from "@/contexts/ActivityContext";

// ============================================================================
// Analytics Types
// ============================================================================

export interface EngagementAnalysis {
  score: number;
  trends: EngagementTrend[];
  factors: EngagementFactors;
  recommendations: string[];
}

export interface EngagementFactors {
  frequency: number; // How often user is active
  duration: number; // How long sessions last
  depth: number; // How deeply engaged in activities
  consistency: number; // How consistent the engagement is
  growth: number; // How engagement is growing over time
}

export interface BehaviorInsight {
  pattern: string;
  confidence: number;
  description: string;
  impact: "positive" | "negative" | "neutral";
  actionable: boolean;
  recommendations: string[];
}

export interface ActivityPattern {
  type: "temporal" | "sequential" | "frequency" | "duration";
  name: string;
  description: string;
  strength: number; // 0-1
  examples: string[];
  implications: string[];
}

export interface PersonalizationProfile {
  userId: string;
  preferences: ActivityPreferences;
  behaviorTraits: BehaviorTrait[];
  learningStyle: LearningStyle;
  engagementProfile: EngagementProfile;
  lastUpdated: Date;
}

export interface ActivityPreferences {
  preferredTimes: number[]; // Hours of day
  preferredDuration: number; // Minutes
  preferredActivities: ActivityType[];
  avoidedActivities: ActivityType[];
  difficultyPreference: "easy" | "medium" | "hard" | "mixed";
}

export interface BehaviorTrait {
  trait: string;
  strength: number; // 0-1
  evidence: string[];
  implications: string[];
}

export interface LearningStyle {
  visual: number;
  auditory: number;
  kinesthetic: number;
  reading: number;
  dominant: "visual" | "auditory" | "kinesthetic" | "reading";
}

export interface EngagementProfile {
  type: "casual" | "regular" | "intensive" | "sporadic";
  score: number;
  characteristics: string[];
  recommendations: string[];
}

// ============================================================================
// Activity Analytics Manager
// ============================================================================

export class ActivityAnalyticsManager {
  /**
   * Calculate engagement trends over time
   */
  static async calculateEngagementTrends(
    _userId: string,
    days: number,
    summary: ActivitySummary,
    metrics: EngagementMetrics | null,
  ): Promise<EngagementTrend[]> {
    const trends: EngagementTrend[] = [];
    const endDate = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);

      // Calculate engagement score for this day
      const dayKey = date.toISOString().split("T")[0];
      const dayActivities = summary.dailyDistribution[dayKey!] || 0;

      // Simulate engagement calculation (in real implementation, this would use actual data)
      const engagementScore = this.calculateDayEngagementScore(
        dayActivities,
        summary,
        metrics,
      );

      // Get top activities for this day (simulated)
      const topActivities = this.getTopActivitiesForDay(date, summary);

      trends.push({
        date,
        engagementScore,
        activityCount: dayActivities,
        sessionDuration: this.estimateSessionDuration(dayActivities),
        topActivities,
      });
    }

    return trends;
  }

  /**
   * Calculate engagement score for a specific day
   */
  private static calculateDayEngagementScore(
    activityCount: number,
    _summary: ActivitySummary,
    metrics: EngagementMetrics | null,
  ): number {
    if (!metrics) return 0;

    // Base score from activity count
    const activityScore = Math.min(1, activityCount / 20); // Normalize to 20 activities

    // Factor in engagement metrics
    const streakBonus = metrics.dailyActiveStreak > 0 ? 0.2 : 0;
    const consistencyBonus =
      (metrics.averageSessionDuration || metrics.averageSessionLength) > 300
        ? 0.1
        : 0; // 5+ minutes

    return Math.min(1, activityScore + streakBonus + consistencyBonus);
  }

  /**
   * Estimate session duration from activity count
   */
  private static estimateSessionDuration(activityCount: number): number {
    // Rough estimate: 30 seconds per activity + base session time
    return Math.max(60, activityCount * 30 + 120); // Minimum 1 minute, base 2 minutes
  }

  /**
   * Get top activities for a specific day
   */
  private static getTopActivitiesForDay(
    _date: Date,
    summary: ActivitySummary,
  ): ActivityType[] {
    // In real implementation, this would query actual daily activity data
    // For now, return most common activities from summary
    return summary.topTopics.slice(0, 3).map(() => "practice" as ActivityType); // Simplified
  }

  /**
   * Analyze overall engagement patterns
   */
  static analyzeEngagementPatterns(
    summary: ActivitySummary,
    metrics: EngagementMetrics,
  ): EngagementAnalysis {
    const factors = this.calculateEngagementFactors(summary, metrics);
    const score = this.calculateOverallEngagementScore(factors);
    const recommendations = this.generateEngagementRecommendations(
      factors,
      score,
    );

    return {
      score,
      trends: [], // Would be populated with historical data
      factors,
      recommendations,
    };
  }

  /**
   * Calculate engagement factors
   */
  private static calculateEngagementFactors(
    summary: ActivitySummary,
    metrics: EngagementMetrics,
  ): EngagementFactors {
    // Frequency: How often user is active
    const frequency = Math.min(1, metrics.dailyActiveStreak / 30); // Normalize to 30 days

    // Duration: Average session length
    const duration = Math.min(
      1,
      (metrics.averageSessionDuration || metrics.averageSessionLength) / 1800,
    ); // Normalize to 30 minutes

    // Depth: Variety and complexity of activities
    const depth = Math.min(1, summary.topTopics.length / 10); // Normalize to 10 topics

    // Consistency: Regular activity pattern
    const consistency = this.calculateConsistencyScore(
      summary.dailyDistribution,
    );

    // Growth: Improvement over time (simplified)
    const growth =
      metrics.weeklyActiveStreak > metrics.dailyActiveStreak ? 0.8 : 0.5;

    return {
      frequency,
      duration,
      depth,
      consistency,
      growth,
    };
  }

  /**
   * Calculate consistency score from daily distribution
   */
  private static calculateConsistencyScore(
    dailyDistribution: Record<string, number>,
  ): number {
    const values = Object.values(dailyDistribution);
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
  }

  /**
   * Calculate overall engagement score
   */
  private static calculateOverallEngagementScore(
    factors: EngagementFactors,
  ): number {
    return (
      factors.frequency * 0.3 +
      factors.duration * 0.2 +
      factors.depth * 0.2 +
      factors.consistency * 0.2 +
      factors.growth * 0.1
    );
  }

  /**
   * Generate engagement recommendations
   */
  private static generateEngagementRecommendations(
    factors: EngagementFactors,
    score: number,
  ): string[] {
    const recommendations: string[] = [];

    if (factors.frequency < 0.5) {
      recommendations.push(
        "Try to practice more regularly - aim for daily sessions",
      );
    }

    if (factors.duration < 0.3) {
      recommendations.push(
        "Consider longer practice sessions for better retention",
      );
    }

    if (factors.depth < 0.4) {
      recommendations.push(
        "Explore more topics to build a well-rounded skill set",
      );
    }

    if (factors.consistency < 0.5) {
      recommendations.push("Establish a consistent practice schedule");
    }

    if (score >= 0.8) {
      recommendations.push("Excellent engagement! Keep up the great work");
    } else if (score >= 0.6) {
      recommendations.push(
        "Good progress - focus on consistency to improve further",
      );
    } else {
      recommendations.push(
        "Consider setting daily practice goals to boost engagement",
      );
    }

    return recommendations;
  }
}

// ============================================================================
// Behavior Pattern Analyzer
// ============================================================================

export class BehaviorPatternAnalyzer {
  /**
   * Detect behavior patterns from activity data
   */
  static async detectPatterns(
    summary: ActivitySummary,
    recentActivities: ActivityRecord[],
    sessionHistory: ActivitySession[],
  ): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];

    // Detect temporal patterns
    const temporalPatterns = this.detectTemporalPatterns(
      summary.hourlyDistribution,
    );
    patterns.push(...temporalPatterns);

    // Detect activity sequence patterns
    const sequencePatterns = this.detectSequencePatterns(recentActivities);
    patterns.push(...sequencePatterns);

    // Detect session patterns
    const sessionPatterns = this.detectSessionPatterns(sessionHistory);
    patterns.push(...sessionPatterns);

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect temporal activity patterns
   */
  private static detectTemporalPatterns(
    hourlyDistribution: Record<number, number>,
  ): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    // Find peak activity hours
    const hours = Object.entries(hourlyDistribution)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);

    if (hours.length > 0) {
      const peakHour = hours[0];
      if (peakHour) {
        const timeOfDay = this.getTimeOfDayLabel(peakHour.hour);

        patterns.push({
          pattern: "time_preference",
          type: "time_preference",
          name: `${timeOfDay} Learner`,
          description: `Most active during ${timeOfDay} hours`,
          frequency: peakHour.count,
          confidence: Math.min(1, peakHour.count / 100), // Normalize
          metadata: {
            peakHour: peakHour.hour,
            timeOfDay,
            activityCount: peakHour.count,
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Get time of day label for hour
   */
  private static getTimeOfDayLabel(hour: number): string {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    return "night";
  }

  /**
   * Detect activity sequence patterns
   */
  private static detectSequencePatterns(
    recentActivities: ActivityRecord[],
  ): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    if (recentActivities.length < 3) return patterns;

    // Look for common activity sequences
    const sequences = this.findCommonSequences(recentActivities, 3);

    for (const [sequence, count] of sequences.entries()) {
      if (count >= 2) {
        // At least 2 occurrences
        patterns.push({
          pattern: "activity_sequence",
          type: "activity_sequence",
          name: "Activity Pattern",
          description: `Tends to follow ${sequence} sequence`,
          frequency: count,
          confidence: Math.min(1, count / 5), // Normalize to 5 occurrences
          metadata: {
            sequence: sequence.split("->"),
            occurrences: count,
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Find common activity sequences
   */
  private static findCommonSequences(
    activities: ActivityRecord[],
    sequenceLength: number,
  ): Map<string, number> {
    const sequences = new Map<string, number>();

    for (let i = 0; i <= activities.length - sequenceLength; i++) {
      const sequence = activities
        .slice(i, i + sequenceLength)
        .map((a) => a.activityType)
        .join("->");

      sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
    }

    return sequences;
  }

  /**
   * Detect session behavior patterns
   */
  private static detectSessionPatterns(
    sessionHistory: ActivitySession[],
  ): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    if (sessionHistory.length < 3) return patterns;

    // Analyze session durations
    const durations = sessionHistory
      .filter((s) => s.duration !== undefined)
      .map((s) => s.duration!);

    if (durations.length > 0) {
      const avgDuration =
        durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const sessionType = this.classifySessionType(avgDuration);

      patterns.push({
        pattern: "session_duration",
        type: "session_duration",
        name: `${sessionType} Sessions`,
        description: `Prefers ${sessionType.toLowerCase()} practice sessions`,
        frequency: durations.length,
        confidence: 0.8,
        metadata: {
          averageDuration: avgDuration,
          sessionType,
          sessionCount: durations.length,
        },
      });
    }

    return patterns;
  }

  /**
   * Classify session type based on duration
   */
  private static classifySessionType(duration: number): string {
    const minutes = duration / (1000 * 60);

    if (minutes < 5) return "Quick";
    if (minutes < 15) return "Short";
    if (minutes < 30) return "Medium";
    if (minutes < 60) return "Long";
    return "Extended";
  }
}

// ============================================================================
// Personalized Insights Generator
// ============================================================================

export class PersonalizedInsightsGenerator {
  /**
   * Generate personalized insights from activity data
   */
  static async generateInsights(
    _userId: string,
    summary: ActivitySummary,
    metrics: EngagementMetrics | null,
    patterns: BehaviorPattern[],
  ): Promise<ActivityInsight[]> {
    const insights: ActivityInsight[] = [];

    // Generate engagement insights
    if (metrics) {
      const engagementInsights = this.generateEngagementInsights(
        metrics,
        summary,
      );
      insights.push(...engagementInsights);
    }

    // Generate pattern-based insights
    const patternInsights = this.generatePatternInsights(patterns, summary);
    insights.push(...patternInsights);

    // Generate progress insights
    const progressInsights = this.generateProgressInsights(summary);
    insights.push(...progressInsights);

    // Generate personalized recommendations
    const personalizedInsights = this.generatePersonalizedRecommendations(
      summary,
      metrics,
      patterns,
    );
    insights.push(...personalizedInsights);

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 10); // Top 10 insights
  }

  /**
   * Generate engagement-based insights
   */
  private static generateEngagementInsights(
    metrics: EngagementMetrics,
    summary: ActivitySummary,
  ): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    // Streak insights
    if (metrics.dailyActiveStreak > 7) {
      insights.push({
        id: `streak_${Date.now()}`,
        userId: summary.userId,
        type: "achievement",
        title: "Great Consistency!",
        description: `You've maintained a ${metrics.dailyActiveStreak}-day learning streak. Keep it up!`,
        severity: "info",
        priority: 8,
        actionable: true,
        category: "engagement",
        actionItems: ["Continue daily practice", "Set streak goals"],
        generatedAt: new Date(),
        metadata: {
          streak: metrics.dailyActiveStreak,
          type: "daily_streak",
        },
      });
    }

    // Session duration insights
    if (
      (metrics.averageSessionDuration || metrics.averageSessionLength) > 1800
    ) {
      // 30+ minutes
      insights.push({
        id: `session_${Date.now()}`,
        userId: summary.userId,
        type: "behavior",
        title: "Deep Learning Sessions",
        description:
          "Your sessions average over 30 minutes, showing great focus and dedication.",
        severity: "info",
        priority: 6,
        actionable: false,
        category: "engagement",
        actionItems: [],
        generatedAt: new Date(),
        metadata: {
          averageDuration:
            metrics.averageSessionDuration || metrics.averageSessionLength,
          type: "session_duration",
        },
      });
    }

    return insights;
  }

  /**
   * Generate pattern-based insights
   */
  private static generatePatternInsights(
    patterns: BehaviorPattern[],
    summary: ActivitySummary,
  ): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    for (const pattern of patterns.slice(0, 3)) {
      // Top 3 patterns
      if (pattern.type === "time_preference") {
        insights.push({
          id: `pattern_${Date.now()}_${Math.random()}`,
          userId: summary.userId,
          type: "pattern",
          title: `${pattern.name} Detected`,
          description: pattern.description,
          severity: "info",
          priority: Math.round(pattern.confidence * 10),
          actionable: true,
          category: "behavior",
          actionItems: ["Optimize schedule", "Plan activities"],
          generatedAt: new Date(),
          metadata: {
            pattern: pattern.name,
            confidence: pattern.confidence,
            type: pattern.type,
          },
        });
      }
    }

    return insights;
  }

  /**
   * Generate progress-based insights
   */
  private static generateProgressInsights(
    summary: ActivitySummary,
  ): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    // Topic diversity insight
    if (summary.topTopics.length > 5) {
      insights.push({
        id: `diversity_${Date.now()}`,
        userId: summary.userId,
        type: "progress",
        title: "Great Topic Diversity",
        description: `You're actively learning ${summary.topTopics.length} different topics. This builds a well-rounded skill set.`,
        severity: "info",
        priority: 7,
        actionable: false,
        category: "progress",
        actionItems: [],
        generatedAt: new Date(),
        metadata: {
          topicCount: summary.topTopics.length,
          type: "topic_diversity",
        },
      });
    }

    return insights;
  }

  /**
   * Generate personalized recommendations
   */
  private static generatePersonalizedRecommendations(
    summary: ActivitySummary,
    metrics: EngagementMetrics | null,
    patterns: BehaviorPattern[],
  ): ActivityInsight[] {
    const insights: ActivityInsight[] = [];

    // Time-based recommendations
    const timePattern = patterns.find((p) => p.type === "time_preference");
    if (timePattern && timePattern.metadata?.timeOfDay) {
      insights.push({
        id: `time_rec_${Date.now()}`,
        userId: summary.userId,
        type: "recommendation",
        title: "Optimize Your Schedule",
        description: `You're most active in the ${timePattern.metadata.timeOfDay}. Consider scheduling important practice sessions during this time.`,
        severity: "info",
        priority: 5,
        actionable: true,
        category: "optimization",
        actionItems: ["Schedule practice sessions", "Set reminders"],
        generatedAt: new Date(),
        metadata: {
          recommendedTime: timePattern.metadata.timeOfDay,
          type: "schedule_optimization",
        },
      });
    }

    // Engagement improvement recommendations
    if (metrics && metrics.dailyActiveStreak < 3) {
      insights.push({
        id: `engagement_rec_${Date.now()}`,
        userId: summary.userId,
        type: "recommendation",
        title: "Build a Learning Habit",
        description:
          "Try practicing for just 10 minutes daily to build consistency and improve retention.",
        severity: "warning",
        priority: 9,
        actionable: true,
        category: "engagement",
        actionItems: [
          "Set daily reminders",
          "Start with 10 minutes",
          "Track progress",
        ],
        generatedAt: new Date(),
        metadata: {
          currentStreak: metrics.dailyActiveStreak,
          type: "habit_building",
        },
      });
    }

    return insights;
  }
}

// ============================================================================
// Activity Recommendation Engine
// ============================================================================

export class ActivityRecommendationEngine {
  /**
   * Generate activity recommendations
   */
  static async generateRecommendations(
    _userId: string,
    summary: ActivitySummary,
    insights: ActivityInsight[],
    patterns: BehaviorPattern[],
  ): Promise<ActivityRecommendation[]> {
    const recommendations: ActivityRecommendation[] = [];

    // Generate time-based recommendations
    const timeRecommendations = this.generateTimeBasedRecommendations(patterns);
    recommendations.push(...timeRecommendations);

    // Generate activity-based recommendations
    const activityRecommendations =
      this.generateActivityRecommendations(summary);
    recommendations.push(...activityRecommendations);

    // Generate engagement recommendations
    const engagementRecommendations =
      this.generateEngagementRecommendations(insights);
    recommendations.push(...engagementRecommendations);

    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 8); // Top 8 recommendations
  }

  /**
   * Generate time-based recommendations
   */
  private static generateTimeBasedRecommendations(
    patterns: BehaviorPattern[],
  ): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];

    const timePattern = patterns.find((p) => p.type === "time_preference");
    if (timePattern && timePattern.metadata?.peakHour) {
      recommendations.push({
        id: `time_${Date.now()}`,
        userId: "", // Will be set by caller
        type: "schedule",
        title: "Optimize Practice Time",
        description: `Schedule your most important practice sessions around ${timePattern.metadata.peakHour}:00 when you're most active.`,
        priority: 7,
        category: "study_schedule",
        actionable: true,
        estimatedImpact: 0.6,
        actions: [
          {
            type: "schedule",
            label: "Set Practice Reminder",
            metadata: { hour: timePattern.metadata.peakHour },
          },
        ],
        applied: false,
        generatedAt: new Date(),
        metadata: {
          recommendedHour: timePattern.metadata.peakHour,
          timeOfDay: timePattern.metadata.timeOfDay,
        },
      });
    }

    return recommendations;
  }

  /**
   * Generate activity-based recommendations
   */
  private static generateActivityRecommendations(
    summary: ActivitySummary,
  ): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];

    // Recommend exploring new topics if user is focused on few topics
    if (summary.topTopics.length < 3) {
      recommendations.push({
        id: `explore_${Date.now()}`,
        userId: summary.userId,
        type: "content",
        title: "Explore New Topics",
        description:
          "Try exploring 2-3 new topics to build a more diverse skill set and discover new interests.",
        priority: 6,
        category: "content",
        actionable: true,
        estimatedImpact: 0.5,
        actions: [
          {
            type: "navigate",
            label: "Browse Topics",
            url: "/topics",
          },
        ],
        applied: false,
        generatedAt: new Date(),
        metadata: {
          currentTopics: summary.topTopics.length,
          recommendedTopics: 3,
        },
      });
    }

    // Recommend focusing on weak areas
    const weakTopics = summary.topTopics
      .filter((topic) => (topic.averageScore || 0) < 0.6)
      .slice(0, 2);

    if (weakTopics.length > 0) {
      recommendations.push({
        id: `focus_${Date.now()}`,
        userId: summary.userId,
        type: "content",
        title: "Strengthen Weak Areas",
        description: `Focus extra practice on ${weakTopics.map((t) => t.topic).join(" and ")} to improve your overall performance.`,
        priority: 8,
        category: "content",
        actionable: true,
        estimatedImpact: 0.7,
        actions: [
          {
            type: "practice",
            label: "Practice Weak Topics",
            metadata: { topics: weakTopics.map((t) => t.topic) },
          },
        ],
        applied: false,
        generatedAt: new Date(),
        metadata: {
          weakTopics: weakTopics.map((t) => t.topic),
          averageScores: weakTopics.map((t) => t.averageScore || 0),
        },
      });
    }

    return recommendations;
  }

  /**
   * Generate engagement recommendations
   */
  private static generateEngagementRecommendations(
    insights: ActivityInsight[],
  ): ActivityRecommendation[] {
    const recommendations: ActivityRecommendation[] = [];

    // Look for engagement-related insights
    const engagementInsights = insights.filter(
      (i) => i.category === "engagement",
    );

    if (engagementInsights.length === 0) {
      // No engagement insights, recommend building habits
      recommendations.push({
        id: `habit_${Date.now()}`,
        userId: "", // Will be set by caller
        type: "habit",
        title: "Build Daily Practice Habit",
        description:
          "Start with just 10 minutes of daily practice to build consistency and improve retention.",
        priority: 9,
        category: "strategy",
        actionable: true,
        estimatedImpact: 0.8,
        actions: [
          {
            type: "schedule",
            label: "Set Daily Reminder",
            metadata: { duration: 10, frequency: "daily" },
          },
        ],
        applied: false,
        generatedAt: new Date(),
        metadata: {
          recommendedDuration: 10,
          frequency: "daily",
        },
      });
    }

    return recommendations;
  }
}

// ============================================================================
// Activity Report Generator
// ============================================================================

export class ActivityReportGenerator {
  /**
   * Generate comprehensive activity report
   */
  static async generateReport(
    userId: string,
    dateRange: DateRange,
    summary: ActivitySummary | null,
    metrics: EngagementMetrics | null,
    patterns: BehaviorPattern[],
  ): Promise<ActivityReport> {
    if (!summary) {
      return this.createEmptyReport(userId, dateRange);
    }

    // Calculate engagement trends
    const engagementTrends =
      await ActivityAnalyticsManager.calculateEngagementTrends(
        userId,
        7, // Last 7 days
        summary,
        metrics,
      );

    // Generate behavior insights
    const behaviorInsights = this.generateBehaviorInsights(patterns);

    // Generate recommendations
    const recommendations = this.generateReportRecommendations(
      summary,
      metrics,
      patterns,
    );

    // Calculate top activities
    const topActivities = this.calculateTopActivities(summary);

    return {
      dateRange,
      totalActivities: summary.totalActivities,
      uniqueDays: Object.keys(summary.dailyDistribution).length,
      averageSessionDuration:
        metrics?.averageSessionDuration || metrics?.averageSessionLength || 0,
      topActivities,
      engagementTrends,
      behaviorInsights,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Create empty report for no data
   */
  private static createEmptyReport(
    _userId: string,
    dateRange: DateRange,
  ): ActivityReport {
    return {
      dateRange,
      totalActivities: 0,
      uniqueDays: 0,
      averageSessionDuration: 0,
      topActivities: [],
      engagementTrends: [],
      behaviorInsights: [],
      recommendations: ["Start practicing to generate your activity report"],
      generatedAt: new Date(),
    };
  }

  /**
   * Generate behavior insights for report
   */
  private static generateBehaviorInsights(
    patterns: BehaviorPattern[],
  ): string[] {
    return patterns
      .slice(0, 5) // Top 5 patterns
      .map((pattern) => pattern.description);
  }

  /**
   * Generate recommendations for report
   */
  private static generateReportRecommendations(
    summary: ActivitySummary,
    metrics: EngagementMetrics | null,
    patterns: BehaviorPattern[],
  ): string[] {
    const recommendations: string[] = [];

    // Consistency recommendations
    if (metrics && metrics.dailyActiveStreak < 7) {
      recommendations.push(
        "Focus on building a consistent daily practice habit",
      );
    }

    // Diversity recommendations
    if (summary.topTopics.length < 3) {
      recommendations.push(
        "Explore more topics to build a well-rounded skill set",
      );
    }

    // Time optimization recommendations
    const timePattern = patterns.find((p) => p.type === "time_preference");
    if (timePattern && timePattern.metadata?.timeOfDay) {
      recommendations.push(
        `Schedule important sessions during your peak ${timePattern.metadata.timeOfDay} hours`,
      );
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Calculate top activities from summary
   */
  private static calculateTopActivities(
    summary: ActivitySummary,
  ): { type: ActivityType; count: number }[] {
    // Simulate top activities calculation
    // In real implementation, this would analyze actual activity data
    return [
      {
        type: "practice" as ActivityType,
        count: Math.floor(summary.totalActivities * 0.6),
      },
      {
        type: "review" as ActivityType,
        count: Math.floor(summary.totalActivities * 0.2),
      },
      {
        type: "assessment" as ActivityType,
        count: Math.floor(summary.totalActivities * 0.1),
      },
      {
        type: "navigation" as ActivityType,
        count: Math.floor(summary.totalActivities * 0.1),
      },
    ];
  }
}

// ============================================================================
// Usage Analytics Calculator
// ============================================================================

export class UsageAnalyticsCalculator {
  /**
   * Calculate usage analytics
   */
  static async calculateUsageAnalytics(
    summary: ActivitySummary,
    metrics: EngagementMetrics | null,
    sessionHistory: ActivitySession[],
  ): Promise<UsageAnalytics> {
    // Calculate daily active users (simplified for single user)
    const dailyActiveUsers = Object.keys(summary.dailyDistribution).length;

    // Calculate average sessions per user
    const averageSessionsPerUser = sessionHistory.length;

    // Find most active hours
    const mostActiveHours = this.findMostActiveHours(
      summary.hourlyDistribution,
    );

    // Get top features (simplified)
    const topFeatures = this.getTopFeatures(summary);

    // Calculate retention rate (simplified)
    const retentionRate = this.calculateRetentionRate(summary, metrics);

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(summary, metrics);

    return {
      dailyActiveUsers,
      averageSessionsPerUser,
      mostActiveHours,
      topFeatures,
      retentionRate,
      engagementScore,
    };
  }

  /**
   * Find most active hours
   */
  private static findMostActiveHours(
    hourlyDistribution: Record<number, number>,
  ): number[] {
    return Object.entries(hourlyDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  /**
   * Get top features (simplified)
   */
  private static getTopFeatures(summary: ActivitySummary): string[] {
    return summary.topTopics.slice(0, 5).map((topic) => topic.topic);
  }

  /**
   * Calculate retention rate (simplified)
   */
  private static calculateRetentionRate(
    _summary: ActivitySummary,
    metrics: EngagementMetrics | null,
  ): number {
    if (!metrics) return 0;

    // Simple retention calculation based on streak
    return Math.min(1, metrics.dailyActiveStreak / 30); // Normalize to 30 days
  }

  /**
   * Calculate engagement score
   */
  private static calculateEngagementScore(
    summary: ActivitySummary,
    metrics: EngagementMetrics | null,
  ): number {
    if (!metrics) return 0;

    // Weighted engagement score
    const activityScore = Math.min(1, summary.totalActivities / 100); // Normalize to 100 activities
    const streakScore = Math.min(1, metrics.dailyActiveStreak / 30); // Normalize to 30 days
    const durationScore = Math.min(
      1,
      (metrics.averageSessionDuration || metrics.averageSessionLength) / 1800,
    ); // Normalize to 30 minutes

    return activityScore * 0.4 + streakScore * 0.4 + durationScore * 0.2;
  }
}

// ============================================================================
// Activity Data Exporter
// ============================================================================

export class ActivityDataExporter {
  /**
   * Export activity data in specified format
   */
  static async exportData(
    format: "json" | "csv",
    summary: ActivitySummary,
    activities: ActivityRecord[],
    sessions: ActivitySession[],
    metrics: EngagementMetrics | null,
  ): Promise<string> {
    const exportData = {
      summary,
      activities: activities.slice(0, 100), // Limit to 100 recent activities
      sessions: sessions.slice(0, 20), // Limit to 20 recent sessions
      metrics,
      exportedAt: new Date().toISOString(),
    };

    if (format === "json") {
      return JSON.stringify(exportData, null, 2);
    } else {
      return this.convertToCSV(exportData);
    }
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: Record<string, unknown>): string {
    const lines: string[] = [];

    // Add summary section
    lines.push("ACTIVITY SUMMARY");
    lines.push("Total Activities,Unique Days,Average Session Duration");
    
    const summary = data.summary as ActivitySummary | undefined;
    const metrics = data.metrics as EngagementMetrics | null | undefined;
    const totalActivities = summary?.totalActivities || 0;
    const uniqueDays = Object.keys(summary?.dailyDistribution || {}).length;
    const avgDuration = metrics?.averageSessionDuration || metrics?.averageSessionLength || 0;
    
    lines.push(`${totalActivities},${uniqueDays},${avgDuration}`);
    lines.push("");

    // Add activities section
    lines.push("RECENT ACTIVITIES");
    lines.push("Timestamp,Activity Type,Metadata");

    const activities = (data.activities as ActivityRecord[] | undefined) || [];
    for (const activity of activities) {
      const metadata = JSON.stringify(activity.metadata).replace(/,/g, ";");
      lines.push(
        `${activity.timestamp.toISOString()},${activity.activityType},"${metadata}"`,
      );
    }

    lines.push("");

    // Add sessions section
    lines.push("SESSIONS");
    lines.push("Start Time,End Time,Duration (ms),Activity Count");

    const sessions = (data.sessions as ActivitySession[] | undefined) || [];
    for (const session of sessions) {
      const endTime = session.endTime
        ? session.endTime.toISOString()
        : "Active";
      const duration = session.duration || 0;
      lines.push(
        `${session.startTime.toISOString()},${endTime},${duration},${session.activities.length}`,
      );
    }

    return lines.join("\n");
  }
}

// ============================================================================
// Export Main Analytics Manager
// ============================================================================

export class ActivityAnalyticsMainManager {
  /**
   * Generate comprehensive activity analytics
   */
  static async generateComprehensiveAnalytics(
    userId: string,
    summary: ActivitySummary,
    metrics: EngagementMetrics | null,
    recentActivities: ActivityRecord[],
    sessionHistory: ActivitySession[],
  ) {
    const [patterns, insights, recommendations, engagementTrends] =
      await Promise.all([
        BehaviorPatternAnalyzer.detectPatterns(
          summary,
          recentActivities,
          sessionHistory,
        ),
        PersonalizedInsightsGenerator.generateInsights(
          userId,
          summary,
          metrics,
          [],
        ),
        ActivityRecommendationEngine.generateRecommendations(
          userId,
          summary,
          [],
          [],
        ),
        ActivityAnalyticsManager.calculateEngagementTrends(
          userId,
          7,
          summary,
          metrics,
        ),
      ]);

    return {
      patterns,
      insights,
      recommendations,
      engagementTrends,
    };
  }
}
