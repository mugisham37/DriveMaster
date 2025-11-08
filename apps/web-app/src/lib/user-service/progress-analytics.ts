/**
 * Progress Analytics and Visualization Utilities
 *
 * Implements:
 * - Progress trend analysis and comparison utilities
 * - Peer comparison and benchmarking features
 * - Progress chart data generation for visualization components
 * - Mastery heatmap and progress timeline data preparation
 * - Requirements: 3.4, 3.5, 10.4, 10.5
 */

import type {
  ProgressSummary,
  SkillMastery,
  WeeklyProgressPoint,
  TimeRange,
} from "@/types/user-service";

// ============================================================================
// Analytics Types
// ============================================================================

export interface ProgressTrend {
  timeRange: TimeRange;
  masteryTrend: number[];
  accuracyTrend: number[];
  studyTimeTrend: number[];
  attemptsTrend: number[];
  timestamps: Date[];
  trendDirection: "up" | "down" | "stable";
  trendStrength: number; // 0-1, how strong the trend is
  projectedMastery?: number; // Projected mastery in 30 days
}

export interface TopicComparison {
  topic: string;
  userMastery: number;
  averageMastery: number;
  percentile: number;
  rank: number;
  totalUsers: number;
  masteryGap: number; // Difference from average
  improvementRate: number; // Weekly improvement rate
  timeToMastery?: number; // Estimated weeks to reach 80% mastery
}

export interface PeerComparison {
  countryCode?: string;
  userRank: number;
  totalUsers: number;
  averageMastery: number;
  userMastery: number;
  percentile: number;
  topPerformers: PeerPerformance[];
  similarPeers: PeerPerformance[];
  improvementOpportunities: string[];
}

export interface PeerPerformance {
  rank: number;
  mastery: number;
  streakDays: number;
  topTopics: string[];
  isAnonymized: boolean;
}

export interface ChartData {
  type: ChartType;
  data: unknown[];
  labels: string[];
  datasets: ChartDataset[];
  options?: ChartOptions;
  generatedAt: Date;
  cacheKey: string;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: "top" | "bottom" | "left" | "right";
    };
    tooltip?: {
      enabled?: boolean;
      mode?: "index" | "point" | "nearest";
    };
  };
  scales?: {
    x?: {
      display?: boolean;
      grid?: { display?: boolean };
    };
    y?: {
      display?: boolean;
      grid?: { display?: boolean };
      min?: number;
      max?: number;
    };
    r?: {
      min?: number;
      max?: number;
      grid?: { display?: boolean };
    };
  };
}

export interface HeatmapData {
  topics: string[];
  weeks: string[];
  values: number[][];
  maxValue: number;
  minValue: number;
  colorScale: string[];
  tooltipData: HeatmapTooltip[][];
  generatedAt: Date;
}

export interface HeatmapTooltip {
  topic: string;
  week: string;
  value: number;
  formattedValue: string;
  practiceCount: number;
  lastPracticed?: Date;
}

export type ChartType =
  | "line"
  | "bar"
  | "radar"
  | "doughnut"
  | "heatmap"
  | "scatter"
  | "area";

// ============================================================================
// Progress Trend Analysis
// ============================================================================

export class ProgressTrendAnalyzer {
  /**
   * Analyze progress trends from weekly progress data
   */
  static analyzeProgressTrends(
    weeklyProgress: WeeklyProgressPoint[],
    timeRange: TimeRange,
  ): ProgressTrend {
    if (weeklyProgress.length < 2) {
      return this.createEmptyTrend(timeRange);
    }

    const sortedProgress = [...weeklyProgress].sort(
      (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime(),
    );

    const masteryTrend = sortedProgress.map((p) => p.mastery);
    const accuracyTrend = sortedProgress.map((p) => p.accuracy);
    const studyTimeTrend = sortedProgress.map((p) => p.studyTime);
    const attemptsTrend = sortedProgress.map((p) => p.attempts);
    const timestamps = sortedProgress.map((p) => new Date(p.week));

    // Calculate trend direction and strength
    const masterySlope = this.calculateSlope(masteryTrend);
    const trendDirection = this.determineTrendDirection(masterySlope);
    const trendStrength = this.calculateTrendStrength(masteryTrend);

    // Project future mastery
    const projectedMastery = this.projectFutureMastery(masteryTrend, 4); // 4 weeks ahead

    return {
      timeRange,
      masteryTrend,
      accuracyTrend,
      studyTimeTrend,
      attemptsTrend,
      timestamps,
      trendDirection,
      trendStrength,
      projectedMastery,
    };
  }

  /**
   * Calculate linear regression slope
   */
  private static calculateSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const xSum = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = values.reduce((sum, val, index) => sum + val * index, 0);
    const xxSum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    return slope;
  }

  /**
   * Determine trend direction from slope
   */
  private static determineTrendDirection(
    slope: number,
  ): "up" | "down" | "stable" {
    const threshold = 0.01; // 1% change threshold
    if (slope > threshold) return "up";
    if (slope < -threshold) return "down";
    return "stable";
  }

  /**
   * Calculate trend strength (R-squared)
   */
  private static calculateTrendStrength(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const totalSumSquares = values.reduce(
      (sum, val) => sum + Math.pow(val - mean, 2),
      0,
    );

    if (totalSumSquares === 0) return 1; // Perfect correlation if no variance

    // Calculate predicted values using linear regression
    const slope = this.calculateSlope(values);
    const intercept = mean - slope * ((values.length - 1) / 2);

    const residualSumSquares = values.reduce((sum, val, index) => {
      const predicted = intercept + slope * index;
      return sum + Math.pow(val - predicted, 2);
    }, 0);

    return Math.max(0, 1 - residualSumSquares / totalSumSquares);
  }

  /**
   * Project future mastery based on current trend
   */
  private static projectFutureMastery(
    masteryValues: number[],
    weeksAhead: number,
  ): number {
    if (masteryValues.length < 2)
      return masteryValues[masteryValues.length - 1] || 0;

    const slope = this.calculateSlope(masteryValues);
    const currentMastery = masteryValues[masteryValues.length - 1] || 0;
    const projected = currentMastery + slope * weeksAhead;

    return Math.max(0, Math.min(1, projected)); // Clamp between 0 and 1
  }

  /**
   * Create empty trend for insufficient data
   */
  private static createEmptyTrend(timeRange: TimeRange): ProgressTrend {
    return {
      timeRange,
      masteryTrend: [],
      accuracyTrend: [],
      studyTimeTrend: [],
      attemptsTrend: [],
      timestamps: [],
      trendDirection: "stable",
      trendStrength: 0,
    };
  }
}

// ============================================================================
// Topic Comparison Analysis
// ============================================================================

export class TopicComparisonAnalyzer {
  /**
   * Generate topic comparison data with peer benchmarking
   */
  static async generateTopicComparisons(
    topics: string[],
    userMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
  ): Promise<TopicComparison[]> {
    const comparisons: TopicComparison[] = [];

    for (const topic of topics) {
      const userMastery = userMasteries.get(topic);
      if (!userMastery) continue;

      // Calculate improvement rate from weekly progress
      const improvementRate = this.calculateImprovementRate(
        topic,
        weeklyProgress,
      );

      // Generate mock peer data (in real implementation, this would come from API)
      const peerData = this.generateMockPeerData(userMastery.mastery);

      // Calculate time to mastery
      const timeToMastery = this.calculateTimeToMastery(
        userMastery.mastery,
        improvementRate,
      );

      comparisons.push({
        topic,
        userMastery: userMastery.mastery,
        averageMastery: peerData.average,
        percentile: peerData.percentile,
        rank: peerData.rank,
        totalUsers: peerData.totalUsers,
        masteryGap: userMastery.mastery - peerData.average,
        improvementRate,
        ...(timeToMastery !== undefined && { timeToMastery }),
      });
    }

    return comparisons.sort((a, b) => b.userMastery - a.userMastery);
  }

  /**
   * Calculate weekly improvement rate for a topic
   */
  private static calculateImprovementRate(
    _topic: string,
    weeklyProgress: WeeklyProgressPoint[],
  ): number {
    if (weeklyProgress.length < 2) return 0;

    // For simplicity, calculate overall mastery improvement rate
    // In real implementation, this would be topic-specific
    const sortedProgress = [...weeklyProgress].sort(
      (a, b) => new Date(a.week).getTime() - new Date(b.week).getTime(),
    );

    const firstMastery = sortedProgress[0]?.mastery || 0;
    const lastMastery = sortedProgress[sortedProgress.length - 1]?.mastery || 0;
    const weeks = sortedProgress.length - 1;

    return weeks > 0 ? (lastMastery - firstMastery) / weeks : 0;
  }

  /**
   * Generate mock peer comparison data
   * In real implementation, this would call the user-service API
   */
  private static generateMockPeerData(userMastery: number) {
    // Generate realistic peer data based on user's mastery
    const baseAverage = 0.6;
    const variance = 0.15;

    const average = Math.max(
      0.1,
      Math.min(0.9, baseAverage + (Math.random() - 0.5) * variance),
    );

    // Calculate percentile based on user mastery vs average
    const percentile = Math.max(
      5,
      Math.min(95, 50 + ((userMastery - average) / 0.4) * 40),
    );

    const totalUsers = Math.floor(Math.random() * 5000) + 5000;
    const rank = Math.floor((totalUsers * (100 - percentile)) / 100);

    return {
      average,
      percentile: Math.round(percentile),
      rank,
      totalUsers,
    };
  }

  /**
   * Calculate estimated weeks to reach mastery (80%)
   */
  private static calculateTimeToMastery(
    currentMastery: number,
    improvementRate: number,
  ): number | undefined {
    const masteryThreshold = 0.8;

    if (currentMastery >= masteryThreshold) return undefined;
    if (improvementRate <= 0) return undefined;

    const remainingMastery = masteryThreshold - currentMastery;
    return Math.ceil(remainingMastery / improvementRate);
  }
}

// ============================================================================
// Peer Comparison Analysis
// ============================================================================

export class PeerComparisonAnalyzer {
  /**
   * Generate comprehensive peer comparison data
   */
  static async generatePeerComparison(
    userSummary: ProgressSummary,
    countryCode?: string,
  ): Promise<PeerComparison> {
    // Generate mock peer data (in real implementation, this would call API)
    const peerData = this.generateMockPeerData(userSummary, countryCode);

    const improvementOpportunities = this.identifyImprovementOpportunities(
      userSummary,
      peerData.averageMastery,
    );

    return {
      countryCode: countryCode || "",
      userRank: peerData.rank,
      totalUsers: peerData.totalUsers,
      averageMastery: peerData.averageMastery,
      userMastery: userSummary.overallMastery,
      percentile: peerData.percentile,
      topPerformers: peerData.topPerformers,
      similarPeers: peerData.similarPeers,
      improvementOpportunities,
    };
  }

  /**
   * Generate mock peer data for comparison
   */
  private static generateMockPeerData(
    userSummary: ProgressSummary,
    countryCode?: string,
  ) {
    const totalUsers = countryCode
      ? Math.floor(Math.random() * 2000) + 1000 // Country-specific
      : Math.floor(Math.random() * 50000) + 10000; // Global

    const averageMastery = 0.55 + (Math.random() - 0.5) * 0.2;

    // Calculate user percentile
    const percentile = Math.max(
      5,
      Math.min(
        95,
        50 + ((userSummary.overallMastery - averageMastery) / 0.4) * 40,
      ),
    );

    const rank = Math.floor((totalUsers * (100 - percentile)) / 100);

    // Generate top performers
    const topPerformers: PeerPerformance[] = Array.from(
      { length: 3 },
      (_, i) => ({
        rank: i + 1,
        mastery: 0.9 + Math.random() * 0.1,
        streakDays: Math.floor(Math.random() * 100) + 50,
        topTopics: this.generateRandomTopics(3),
        isAnonymized: true,
      }),
    );

    // Generate similar peers
    const similarPeers: PeerPerformance[] = Array.from(
      { length: 3 },
      (_, i) => {
        const masteryVariance = 0.05;
        const similarMastery = Math.max(
          0.1,
          Math.min(
            0.9,
            userSummary.overallMastery +
              (Math.random() - 0.5) * masteryVariance,
          ),
        );

        return {
          rank: rank + (i - 1) * 10,
          mastery: similarMastery,
          streakDays: Math.floor(Math.random() * 30) + 10,
          topTopics: this.generateRandomTopics(2),
          isAnonymized: true,
        };
      },
    );

    return {
      totalUsers,
      averageMastery,
      percentile: Math.round(percentile),
      rank,
      topPerformers,
      similarPeers,
    };
  }

  /**
   * Generate random topic names for mock data
   */
  private static generateRandomTopics(count: number): string[] {
    const topics = [
      "Arrays",
      "Strings",
      "Hash Tables",
      "Trees",
      "Graphs",
      "Dynamic Programming",
      "Recursion",
      "Sorting",
      "Searching",
      "Linked Lists",
      "Stacks",
      "Queues",
      "Heaps",
      "Tries",
    ];

    return topics.sort(() => Math.random() - 0.5).slice(0, count);
  }

  /**
   * Identify improvement opportunities based on peer comparison
   */
  private static identifyImprovementOpportunities(
    userSummary: ProgressSummary,
    averageMastery: number,
  ): string[] {
    const opportunities: string[] = [];

    // Check overall mastery gap
    if (userSummary.overallMastery < averageMastery) {
      opportunities.push(
        "Focus on consistent daily practice to catch up with peers",
      );
    }

    // Check accuracy rate
    if (userSummary.accuracyRate < 0.7) {
      opportunities.push(
        "Review fundamentals to improve accuracy before advancing",
      );
    }

    // Check learning streak
    if (userSummary.consecutiveDays < 7) {
      opportunities.push(
        "Build a consistent learning streak for better retention",
      );
    }

    // Check topic diversity
    const masteredTopics = userSummary.masteredTopics;
    const totalTopics = userSummary.totalTopics;
    if (masteredTopics / totalTopics < 0.3) {
      opportunities.push(
        "Explore more topics to build a well-rounded foundation",
      );
    }

    return opportunities;
  }
}

// ============================================================================
// Chart Data Generation
// ============================================================================

export class ChartDataGenerator {
  /**
   * Generate progress chart data for different visualization types
   */
  static generateProgressChartData(
    type: ChartType,
    progressData: {
      weeklyProgress: WeeklyProgressPoint[];
      skillMasteries: Map<string, SkillMastery>;
      summary: ProgressSummary;
    },
  ): ChartData {
    const cacheKey = `${type}-${Date.now()}`;

    switch (type) {
      case "line":
        return this.generateLineChart(progressData, cacheKey);
      case "radar":
        return this.generateRadarChart(progressData, cacheKey);
      case "bar":
        return this.generateBarChart(progressData, cacheKey);
      case "doughnut":
        return this.generateDoughnutChart(progressData, cacheKey);
      case "area":
        return this.generateAreaChart(progressData, cacheKey);
      default:
        return this.generateEmptyChart(type, cacheKey);
    }
  }

  /**
   * Generate line chart for progress trends
   */
  private static generateLineChart(
    progressData: { weeklyProgress: WeeklyProgressPoint[] },
    cacheKey: string,
  ): ChartData {
    const { weeklyProgress } = progressData;

    const labels = weeklyProgress.map((p) =>
      new Date(p.week).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );

    return {
      type: "line",
      data: weeklyProgress,
      labels,
      datasets: [
        {
          label: "Mastery Progress",
          data: weeklyProgress.map((p) => Math.round(p.mastery * 100)),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Accuracy Rate",
          data: weeklyProgress.map((p) => Math.round(p.accuracy * 100)),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
        },
        scales: {
          y: {
            display: true,
            min: 0,
            max: 100,
            grid: { display: true },
          },
          x: {
            display: true,
            grid: { display: false },
          },
        },
      },
      generatedAt: new Date(),
      cacheKey,
    };
  }

  /**
   * Generate radar chart for skill mastery
   */
  private static generateRadarChart(
    progressData: { skillMasteries: Map<string, SkillMastery> },
    cacheKey: string,
  ): ChartData {
    const { skillMasteries } = progressData;

    // Get top 6 skills for radar chart
    const topSkills = Array.from(skillMasteries.entries())
      .sort(([, a], [, b]) => b.mastery - a.mastery)
      .slice(0, 6);

    const labels = topSkills.map(([topic]) => topic);
    const data = topSkills.map(([, mastery]) =>
      Math.round(mastery.mastery * 100),
    );

    return {
      type: "radar",
      data: topSkills,
      labels,
      datasets: [
        {
          label: "Skill Mastery",
          data,
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          borderColor: "#3b82f6",
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
          },
        },
      },
      generatedAt: new Date(),
      cacheKey,
    };
  }

  /**
   * Generate bar chart for topic comparison
   */
  private static generateBarChart(
    progressData: { skillMasteries: Map<string, SkillMastery> },
    cacheKey: string,
  ): ChartData {
    const { skillMasteries } = progressData;

    const topSkills = Array.from(skillMasteries.entries())
      .sort(([, a], [, b]) => b.mastery - a.mastery)
      .slice(0, 8);

    const labels = topSkills.map(([topic]) => topic);
    const data = topSkills.map(([, mastery]) =>
      Math.round(mastery.mastery * 100),
    );

    return {
      type: "bar",
      data: topSkills,
      labels,
      datasets: [
        {
          label: "Mastery Level (%)",
          data,
          backgroundColor: data.map((value) =>
            value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#ef4444",
          ),
          borderWidth: 0,
        },
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            display: true,
            min: 0,
            max: 100,
            grid: { display: true },
          },
          x: {
            display: true,
            grid: { display: false },
          },
        },
      },
      generatedAt: new Date(),
      cacheKey,
    };
  }

  /**
   * Generate doughnut chart for mastery distribution
   */
  private static generateDoughnutChart(
    progressData: { summary: ProgressSummary },
    cacheKey: string,
  ): ChartData {
    const { summary } = progressData;

    const masteredTopics = summary.masteredTopics;
    const inProgressTopics = summary.totalTopics - masteredTopics;
    const notStartedTopics = Math.max(0, 20 - summary.totalTopics); // Assume 20 total available topics

    const labels = ["Mastered", "In Progress", "Not Started"];
    const data = [masteredTopics, inProgressTopics, notStartedTopics];

    return {
      type: "doughnut",
      data: [masteredTopics, inProgressTopics, notStartedTopics],
      labels,
      datasets: [
        {
          label: "Topic Progress",
          data,
          backgroundColor: ["#10b981", "#f59e0b", "#e5e7eb"],
          borderWidth: 0,
        },
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
        },
      },
      generatedAt: new Date(),
      cacheKey,
    };
  }

  /**
   * Generate area chart for study time trends
   */
  private static generateAreaChart(
    progressData: { weeklyProgress: WeeklyProgressPoint[] },
    cacheKey: string,
  ): ChartData {
    const { weeklyProgress } = progressData;

    const labels = weeklyProgress.map((p) =>
      new Date(p.week).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );

    return {
      type: "area",
      data: weeklyProgress,
      labels,
      datasets: [
        {
          label: "Study Time (hours)",
          data: weeklyProgress.map((p) => Math.round(p.studyTime / 3600)), // Convert seconds to hours
          backgroundColor: "rgba(139, 92, 246, 0.3)",
          borderColor: "#8b5cf6",
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
        },
        scales: {
          y: {
            display: true,
            min: 0,
            grid: { display: true },
          },
          x: {
            display: true,
            grid: { display: false },
          },
        },
      },
      generatedAt: new Date(),
      cacheKey,
    };
  }

  /**
   * Generate empty chart for unsupported types
   */
  private static generateEmptyChart(
    type: ChartType,
    cacheKey: string,
  ): ChartData {
    return {
      type,
      data: [],
      labels: [],
      datasets: [],
      generatedAt: new Date(),
      cacheKey,
    };
  }
}

// ============================================================================
// Heatmap Data Generation
// ============================================================================

export class HeatmapDataGenerator {
  /**
   * Generate mastery heatmap data for visualization
   */
  static generateMasteryHeatmapData(
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
  ): HeatmapData {
    // Get top topics for heatmap (limit to 10 for readability)
    const topTopics = Array.from(skillMasteries.entries())
      .sort(([, a], [, b]) => b.mastery - a.mastery)
      .slice(0, 10)
      .map(([topic]) => topic);

    // Get last 12 weeks for heatmap
    const sortedWeeks = [...weeklyProgress]
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
      .slice(-12);

    const weeks = sortedWeeks.map((p) =>
      new Date(p.week).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );

    // Generate values matrix
    const values: number[][] = topTopics.map((topic) => {
      const mastery = skillMasteries.get(topic);
      // Simulate weekly mastery progression
      return weeks.map((_, weekIndex) => {
        if (!mastery) return 0;
        // Simulate gradual improvement over weeks
        const progressFactor = (weekIndex + 1) / weeks.length;
        return Math.min(mastery.mastery, mastery.mastery * progressFactor);
      });
    });

    // Calculate min/max values
    const allValues = values.flat();
    const maxValue = Math.max(...allValues, 1);
    const minValue = Math.min(...allValues, 0);

    // Generate color scale
    const colorScale = [
      "#f3f4f6", // Very low
      "#ddd6fe", // Low
      "#c4b5fd", // Medium-low
      "#a78bfa", // Medium
      "#8b5cf6", // Medium-high
      "#7c3aed", // High
      "#6d28d9", // Very high
    ];

    // Generate tooltip data
    const tooltipData: HeatmapTooltip[][] = topTopics.map(
      (topic, topicIndex) => {
        const mastery = skillMasteries.get(topic);
        return weeks.map((week, weekIndex) => ({
          topic,
          week,
          value: values[topicIndex]?.[weekIndex] || 0,
          formattedValue: `${Math.round((values[topicIndex]?.[weekIndex] || 0) * 100)}%`,
          practiceCount: mastery?.practiceCount || 0,
          ...(mastery?.lastPracticed && {
            lastPracticed: mastery.lastPracticed,
          }),
        }));
      },
    );

    return {
      topics: topTopics,
      weeks,
      values,
      maxValue,
      minValue,
      colorScale,
      tooltipData,
      generatedAt: new Date(),
    };
  }
}

// ============================================================================
// Export Main Analytics Manager
// ============================================================================

export class ProgressAnalyticsManager {
  /**
   * Generate comprehensive progress analytics
   */
  static async generateProgressAnalytics(
    summary: ProgressSummary,
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
    timeRange: TimeRange,
  ) {
    const [trends, topicComparisons, peerComparison] = await Promise.all([
      Promise.resolve(
        ProgressTrendAnalyzer.analyzeProgressTrends(weeklyProgress, timeRange),
      ),
      TopicComparisonAnalyzer.generateTopicComparisons(
        Array.from(skillMasteries.keys()).slice(0, 10),
        skillMasteries,
        weeklyProgress,
      ),
      PeerComparisonAnalyzer.generatePeerComparison(summary),
    ]);

    return {
      trends,
      topicComparisons,
      peerComparison,
    };
  }

  /**
   * Generate all chart data types
   */
  static generateAllChartData(progressData: {
    weeklyProgress: WeeklyProgressPoint[];
    skillMasteries: Map<string, SkillMastery>;
    summary: ProgressSummary;
  }) {
    const chartTypes: ChartType[] = [
      "line",
      "radar",
      "bar",
      "doughnut",
      "area",
    ];

    return chartTypes.reduce(
      (charts, type) => {
        charts[type] = ChartDataGenerator.generateProgressChartData(
          type,
          progressData,
        );
        return charts;
      },
      {} as Record<ChartType, ChartData>,
    );
  }

  /**
   * Generate heatmap data
   */
  static generateHeatmapData(
    skillMasteries: Map<string, SkillMastery>,
    weeklyProgress: WeeklyProgressPoint[],
  ): HeatmapData {
    return HeatmapDataGenerator.generateMasteryHeatmapData(
      skillMasteries,
      weeklyProgress,
    );
  }
}
