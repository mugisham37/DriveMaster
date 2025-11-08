"use client";

import React, { useEffect, useState } from "react";

export interface ImpactStatProps {
  metricType: string;
  initialValue: number;
}

/**
 * ImpactStat Component
 * Displays animated statistics for impact metrics
 */
export function ImpactStat({ metricType, initialValue }: ImpactStatProps) {
  const [value, setValue] = useState(initialValue);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Animate to the initial value
    setIsAnimating(true);
    const duration = 1500;
    const steps = 60;
    const increment = initialValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(step * increment, initialValue);
      setValue(Math.floor(current));

      if (step >= steps) {
        clearInterval(timer);
        setIsAnimating(false);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [initialValue]);

  return (
    <div className={`impact-stat ${isAnimating ? "animating" : ""}`}>
      <div className="impact-stat-value">{value.toLocaleString()}</div>
      <div className="impact-stat-label">{metricType}</div>
    </div>
  );
}
