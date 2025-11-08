"use client";

import { useEffect } from "react";

/**
 * PerformanceMonitor component
 * Monitors and logs web vitals and performance metrics
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return undefined;

    // Monitor Core Web Vitals
    const reportWebVitals = (metric: {
      name: string;
      value: number;
      id: string;
    }) => {
      // Log to console in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Performance] ${metric.name}:`, metric.value);
      }

      // Send to analytics endpoint in production
      if (process.env.NODE_ENV === "production") {
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
        });

        // Use sendBeacon if available, fallback to fetch
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/analytics/vitals", body);
        } else {
          fetch("/api/analytics/vitals", {
            body,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
          }).catch(console.error);
        }
      }
    };

    // Import and use web-vitals library if available
    import("web-vitals")
      .then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
        onCLS(reportWebVitals);
        onFCP(reportWebVitals);
        onLCP(reportWebVitals);
        onTTFB(reportWebVitals);
        onINP(reportWebVitals);
      })
      .catch((error) => {
        // Fallback: web-vitals not available
        console.warn("Web vitals monitoring unavailable:", error);
      });

    // Monitor long tasks
    if ("PerformanceObserver" in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (process.env.NODE_ENV === "development") {
              console.log(
                `[Performance] Long task detected: ${entry.duration}ms`,
              );
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ["longtask"] });

        return () => {
          longTaskObserver.disconnect();
        };
      } catch (error) {
        console.warn("Long task monitoring unavailable:", error);
        return undefined;
      }
    }

    return undefined;
  }, []);

  // This component doesn't render anything
  return null;
}
