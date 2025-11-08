/**
 * A/B Testing Support for Notification Optimization
 *
 * Provides A/B testing capabilities for notification content, timing,
 * and delivery optimization with statistical significance calculation.
 *
 * Requirements: 5.5 (Optional Task 7.3)
 */

import { getNotificationAnalyticsService } from "./analytics-service";

// ============================================================================
// Types
// ============================================================================

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // 0-1, should sum to 1 across all variants
  config: Record<string, unknown>;
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  variants: ABTestVariant[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  targetMetric: string;
  minimumSampleSize: number;
  confidenceLevel: number; // 0.95 for 95% confidence
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  userId: string;
  timestamp: Date;
  outcome: boolean; // true if the target metric was achieved
  metadata?: Record<string, unknown>;
}

export interface ABTestStatistics {
  variantId: string;
  sampleSize: number;
  conversionRate: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  isStatisticallySignificant: boolean;
  pValue: number;
}

export interface ABTestAnalysis {
  testId: string;
  status: "running" | "completed" | "inconclusive";
  winner?: string | undefined;
  statistics: ABTestStatistics[];
  recommendations: string[];
}

// ============================================================================
// A/B Testing Manager
// ============================================================================

export class ABTestingManager {
  private tests: Map<string, ABTest> = new Map();
  private assignments: Map<string, Map<string, string>> = new Map(); // userId -> testId -> variantId
  private results: ABTestResult[] = [];

  /**
   * Create a new A/B test
   */
  createTest(test: Omit<ABTest, "id">): ABTest {
    const testId = this.generateTestId();
    const newTest: ABTest = {
      ...test,
      id: testId,
    };

    // Validate variants
    this.validateTest(newTest);

    this.tests.set(testId, newTest);
    return newTest;
  }

  /**
   * Get a variant for a user in a specific test
   */
  getVariant(testId: string, userId: string): ABTestVariant | null {
    const test = this.tests.get(testId);
    if (!test || !test.isActive) {
      return null;
    }

    // Check if user already has an assignment
    const userAssignments = this.assignments.get(userId) || new Map();
    const existingVariant = userAssignments.get(testId);

    if (existingVariant) {
      return test.variants.find((v) => v.id === existingVariant) || null;
    }

    // Assign new variant based on weights
    const variant = this.assignVariant(test, userId);

    // Store assignment
    if (!this.assignments.has(userId)) {
      this.assignments.set(userId, new Map());
    }
    this.assignments.get(userId)!.set(testId, variant.id);

    return variant;
  }

  /**
   * Record a test result
   */
  recordResult(result: Omit<ABTestResult, "timestamp">): void {
    const fullResult: ABTestResult = {
      ...result,
      timestamp: new Date(),
    };

    this.results.push(fullResult);

    // Track with analytics service
    const analyticsService = getNotificationAnalyticsService();
    analyticsService.trackClick(
      `ab-test-${result.testId}`,
      result.userId,
      `variant-${result.variantId}-${result.outcome ? "success" : "failure"}`,
    );
  }

  /**
   * Analyze test results
   */
  analyzeTest(testId: string): ABTestAnalysis {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const testResults = this.results.filter((r) => r.testId === testId);
    const statistics = this.calculateStatistics(test, testResults);

    const analysis: ABTestAnalysis = {
      testId,
      status: this.determineTestStatus(test, statistics),
      statistics,
      recommendations: this.generateRecommendations(test, statistics),
    };

    // Determine winner if statistically significant
    const significantVariants = statistics.filter(
      (s) => s.isStatisticallySignificant,
    );
    if (significantVariants.length > 0) {
      analysis.winner = significantVariants.reduce((best, current) =>
        current.conversionRate > best.conversionRate ? current : best,
      ).variantId;
    }

    return analysis;
  }

  /**
   * Get all active tests for a user
   */
  getActiveTests(
    userId: string,
  ): Array<{ test: ABTest; variant: ABTestVariant }> {
    const activeTests: Array<{ test: ABTest; variant: ABTestVariant }> = [];

    for (const test of this.tests.values()) {
      if (test.isActive) {
        const variant = this.getVariant(test.id, userId);
        if (variant) {
          activeTests.push({ test, variant });
        }
      }
    }

    return activeTests;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateTest(test: ABTest): void {
    // Check that weights sum to 1
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
      throw new Error("Variant weights must sum to 1");
    }

    // Check for duplicate variant IDs
    const variantIds = test.variants.map((v) => v.id);
    if (new Set(variantIds).size !== variantIds.length) {
      throw new Error("Variant IDs must be unique");
    }

    // Check confidence level
    if (test.confidenceLevel <= 0 || test.confidenceLevel >= 1) {
      throw new Error("Confidence level must be between 0 and 1");
    }
  }

  private assignVariant(test: ABTest, userId: string): ABTestVariant {
    // Use user ID to create deterministic but random assignment
    const hash = this.hashUserId(userId, test.id);
    const random = hash / 0xffffffff; // Normalize to 0-1

    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant;
      }
    }

    // Fallback to last variant (guaranteed to exist since test must have at least one variant)
    const lastVariant = test.variants[test.variants.length - 1];
    if (!lastVariant) {
      throw new Error("Test must have at least one variant");
    }
    return lastVariant;
  }

  private hashUserId(userId: string, testId: string): number {
    const str = `${userId}-${testId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateStatistics(
    test: ABTest,
    results: ABTestResult[],
  ): ABTestStatistics[] {
    return test.variants.map((variant) => {
      const variantResults = results.filter((r) => r.variantId === variant.id);
      const sampleSize = variantResults.length;
      const successes = variantResults.filter((r) => r.outcome).length;
      const conversionRate = sampleSize > 0 ? successes / sampleSize : 0;

      // Calculate confidence interval using Wilson score interval
      const { lower, upper } = this.calculateWilsonInterval(
        successes,
        sampleSize,
        test.confidenceLevel,
      );

      // Calculate statistical significance (simplified z-test)
      const isStatisticallySignificant =
        sampleSize >= test.minimumSampleSize &&
        this.isStatisticallySignificant(test, results, variant.id);

      const pValue = this.calculatePValue(test, results, variant.id);

      return {
        variantId: variant.id,
        sampleSize,
        conversionRate,
        confidenceInterval: { lower, upper },
        isStatisticallySignificant,
        pValue,
      };
    });
  }

  private calculateWilsonInterval(
    successes: number,
    trials: number,
    confidence: number,
  ): { lower: number; upper: number } {
    if (trials === 0) {
      return { lower: 0, upper: 0 };
    }

    const z = this.getZScore(confidence);
    const p = successes / trials;
    const n = trials;

    const center = p + (z * z) / (2 * n);
    const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
    const denominator = 1 + (z * z) / n;

    return {
      lower: Math.max(0, (center - margin) / denominator),
      upper: Math.min(1, (center + margin) / denominator),
    };
  }

  private getZScore(confidence: number): number {
    // Approximate z-scores for common confidence levels
    const zScores: Record<string, number> = {
      "0.90": 1.645,
      "0.95": 1.96,
      "0.99": 2.576,
    };

    return zScores[confidence.toString()] || 1.96;
  }

  private isStatisticallySignificant(
    test: ABTest,
    results: ABTestResult[],
    variantId: string,
  ): boolean {
    // Simplified significance test - compare against control (first variant)
    const controlVariant = test.variants[0];
    if (!controlVariant) {
      return false; // No control variant available
    }

    if (variantId === controlVariant.id) {
      return false; // Control is baseline
    }

    const controlResults = results.filter(
      (r) => r.variantId === controlVariant.id,
    );
    const variantResults = results.filter((r) => r.variantId === variantId);

    if (
      controlResults.length < test.minimumSampleSize ||
      variantResults.length < test.minimumSampleSize
    ) {
      return false;
    }

    const controlRate =
      controlResults.filter((r) => r.outcome).length / controlResults.length;
    const variantRate =
      variantResults.filter((r) => r.outcome).length / variantResults.length;

    // Simple threshold-based significance (in practice, use proper statistical tests)
    const difference = Math.abs(variantRate - controlRate);
    return difference > 0.05; // 5% minimum difference
  }

  private calculatePValue(
    test: ABTest,
    results: ABTestResult[],
    variantId: string,
  ): number {
    // Simplified p-value calculation
    // In practice, use proper statistical tests like chi-square or t-test
    console.log("Calculating p-value for test:", test.id, "variant:", variantId, "results:", results.length);
    return 0.05; // Placeholder
  }

  private determineTestStatus(
    test: ABTest,
    statistics: ABTestStatistics[],
  ): "running" | "completed" | "inconclusive" {
    const now = new Date();

    if (test.endDate && now > test.endDate) {
      const hasSignificantResults = statistics.some(
        (s) => s.isStatisticallySignificant,
      );
      return hasSignificantResults ? "completed" : "inconclusive";
    }

    return "running";
  }

  private generateRecommendations(
    test: ABTest,
    statistics: ABTestStatistics[],
  ): string[] {
    const recommendations: string[] = [];

    const significantVariants = statistics.filter(
      (s) => s.isStatisticallySignificant,
    );

    if (significantVariants.length === 0) {
      recommendations.push(
        "No statistically significant results yet. Continue running the test.",
      );

      const minSampleSize = Math.min(...statistics.map((s) => s.sampleSize));
      if (minSampleSize < test.minimumSampleSize) {
        recommendations.push(
          `Increase sample size. Current minimum: ${minSampleSize}, required: ${test.minimumSampleSize}`,
        );
      }
    } else {
      const winner = significantVariants.reduce((best, current) =>
        current.conversionRate > best.conversionRate ? current : best,
      );

      recommendations.push(
        `Variant ${winner.variantId} is performing best with ${(winner.conversionRate * 100).toFixed(1)}% conversion rate`,
      );
      recommendations.push(
        "Consider implementing the winning variant for all users",
      );
    }

    return recommendations;
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let abTestingManagerInstance: ABTestingManager | null = null;

export function getABTestingManager(): ABTestingManager {
  if (!abTestingManagerInstance) {
    abTestingManagerInstance = new ABTestingManager();
  }
  return abTestingManagerInstance;
}

// ============================================================================
// React Hook for A/B Testing
// ============================================================================

export function useABTest(testId: string, userId: string) {
  const manager = getABTestingManager();
  const variant = manager.getVariant(testId, userId);

  const recordResult = (
    outcome: boolean,
    metadata?: Record<string, unknown> | undefined,
  ) => {
    if (variant) {
      const result: Omit<ABTestResult, "timestamp"> = {
        testId,
        variantId: variant.id,
        userId,
        outcome,
      };
      if (metadata !== undefined) {
        result.metadata = metadata;
      }
      manager.recordResult(result);
    }
  };

  return {
    variant,
    recordResult,
    isInTest: variant !== null,
  };
}
