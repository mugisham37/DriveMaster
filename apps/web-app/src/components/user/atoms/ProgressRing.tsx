"use client";

/**
 * ProgressRing - Atomic Component
 * 
 * Circular progress indicator with SVG.
 * Animated transitions for value changes.
 * 
 * Requirements: 12.2, 5.2
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = "#3b82f6",
  showLabel = true,
  label,
  className,
}: ProgressRingProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (normalizedValue / 100) * circumference;

  const ariaLabel = label 
    ? `${label}: ${Math.round(normalizedValue)} percent complete`
    : `${Math.round(normalizedValue)} percent complete`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(normalizedValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className="text-2xl font-bold text-gray-900">
            {Math.round(normalizedValue)}%
          </span>
          {label && (
            <span className="text-xs text-gray-500 mt-1">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default ProgressRing;
