"use client";

import { createRoot } from "react-dom/client";
import { ImpactStat } from "@/components/impact/ImpactStat";
import { ImpactMap } from "@/components/impact/ImpactMap";
import { ImpactChart } from "@/components/impact/ImpactChart";
import { ImpactTestimonialsList } from "@/components/impact/ImpactTestimonialsList";

// Initialize impact components on page load
export function initializeImpactComponents() {
  // Initialize Impact Stats
  const statElements = document.querySelectorAll("[data-metric-type]");
  statElements.forEach((element) => {
    const metricType = element.getAttribute("data-metric-type");
    const initialValue = parseInt(element.textContent || "0");

    if (metricType) {
      const root = createRoot(element);
      root.render(ImpactStat({ metricType, initialValue }));
    }
  });

  // Initialize Impact Map
  const mapContainer = document.getElementById("impact-map-container");
  if (mapContainer) {
    const metricsData = mapContainer.getAttribute("data-metrics");
    const metrics = metricsData ? JSON.parse(metricsData) : [];

    const root = createRoot(mapContainer);
    root.render(ImpactMap({ initialMetrics: metrics }));
  }

  // Initialize Impact Chart
  const chartContainer = document.getElementById("impact-chart-container");
  if (chartContainer) {
    const usersPerMonth =
      chartContainer.getAttribute("data-users-per-month") || "{}";
    const milestones = chartContainer.getAttribute("data-milestones") || "[]";

    const root = createRoot(chartContainer);
    root.render(ImpactChart({ usersPerMonth, milestones }));
  }

  // Initialize Impact Testimonials
  const testimonialsContainer = document.getElementById(
    "impact-testimonials-container",
  );
  if (testimonialsContainer) {
    const root = createRoot(testimonialsContainer);
    root.render(
      ImpactTestimonialsList({
        endpoint: "/api/impact/testimonials",
        defaultSelected: null,
      }),
    );
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeImpactComponents);
  } else {
    initializeImpactComponents();
  }
}
