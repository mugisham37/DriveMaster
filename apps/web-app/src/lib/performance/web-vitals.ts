/**
 * Web Vitals Integration
 * Provides Core Web Vitals tracking for performance monitoring
 */

export interface WebVitalsMetric {
  name: "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
  value: number;
  id: string;
  delta: number;
  rating: "good" | "needs-improvement" | "poor";
}

export type WebVitalsCallback = (metric: WebVitalsMetric) => void;

/**
 * Report Web Vitals metrics
 */
export function reportWebVitals(callback: WebVitalsCallback): void {
  if (typeof window === "undefined") return;

  // Import web-vitals dynamically to avoid SSR issues
  import("web-vitals")
    .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      onCLS(callback);
      onINP(callback);
      onLCP(callback);
      onFCP(callback);
      onTTFB(callback);
    })
    .catch((error) => {
      console.warn("[WebVitals] Failed to load web-vitals library:", error);
    });
}

/**
 * Get Web Vitals rating based on thresholds
 */
export function getWebVitalRating(
  name: WebVitalsMetric["name"],
  value: number,
): WebVitalsMetric["rating"] {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[name];
  if (!threshold) return "good";

  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

/**
 * Format Web Vitals value for display
 */
export function formatWebVitalValue(
  name: WebVitalsMetric["name"],
  value: number,
): string {
  switch (name) {
    case "CLS":
      return value.toFixed(3);
    case "LCP":
    case "INP":
    case "FCP":
    case "TTFB":
      return `${Math.round(value)}ms`;
    default:
      return value.toString();
  }
}

/**
 * Get Web Vitals description
 */
export function getWebVitalDescription(name: WebVitalsMetric["name"]): string {
  const descriptions = {
    LCP: "Largest Contentful Paint - measures loading performance",
    INP: "Interaction to Next Paint - measures interactivity",
    CLS: "Cumulative Layout Shift - measures visual stability",
    FCP: "First Contentful Paint - measures loading performance",
    TTFB: "Time to First Byte - measures server response time",
  };

  return descriptions[name] || "Unknown metric";
}
