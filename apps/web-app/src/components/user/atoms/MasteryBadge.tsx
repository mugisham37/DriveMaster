"use client";

/**
 * MasteryBadge - Atomic Component
 * 
 * Visual indicator of skill level.
 * Color-coded by mastery level with optional percentage display.
 * 
 * Requirements: 12.2, 5.2
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface MasteryBadgeProps {
  level: "beginner" | "intermediate" | "advanced" | "expert";
  mastery: number; // 0-1
  size?: "sm" | "md";
  showPercentage?: boolean;
  className?: string;
}

const levelConfig = {
  beginner: {
    label: "Beginner",
    color: "bg-gray-100 text-gray-800 border-gray-300",
    range: [0, 0.25],
  },
  intermediate: {
    label: "Intermediate",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    range: [0.25, 0.6],
  },
  advanced: {
    label: "Advanced",
    color: "bg-green-100 text-green-800 border-green-300",
    range: [0.6, 0.85],
  },
  expert: {
    label: "Expert",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    range: [0.85, 1],
  },
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
};

export function getMasteryLevel(mastery: number): "beginner" | "intermediate" | "advanced" | "expert" {
  if (mastery >= 0.85) return "expert";
  if (mastery >= 0.6) return "advanced";
  if (mastery >= 0.25) return "intermediate";
  return "beginner";
}

export function MasteryBadge({
  level,
  mastery,
  size = "md",
  showPercentage = false,
  className,
}: MasteryBadgeProps) {
  const config = levelConfig[level];
  const percentage = Math.round(mastery * 100);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full border",
        config.color,
        sizeClasses[size],
        className,
      )}
    >
      <span>{config.label}</span>
      {showPercentage && (
        <span className="opacity-75">({percentage}%)</span>
      )}
    </div>
  );
}

export default MasteryBadge;
