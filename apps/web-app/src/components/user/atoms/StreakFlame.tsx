"use client";

/**
 * StreakFlame - Atomic Component
 * 
 * Animated flame icon for learning streaks.
 * Intensity increases with streak length.
 * Celebration animation for milestone streaks.
 * 
 * Requirements: 12.2, 5.4
 */

import * as React from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StreakFlameProps {
  streak: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

function getFlameColor(streak: number): string {
  if (streak >= 100) return "text-purple-500";
  if (streak >= 30) return "text-orange-500";
  if (streak >= 7) return "text-yellow-500";
  return "text-red-500";
}

function isMilestone(streak: number): boolean {
  return streak === 7 || streak === 30 || streak === 100;
}

export function StreakFlame({
  streak,
  size = "md",
  animated = true,
  showLabel = true,
  className,
}: StreakFlameProps) {
  const [celebrate, setCelebrate] = React.useState(false);
  const flameColor = getFlameColor(streak);

  React.useEffect(() => {
    if (isMilestone(streak)) {
      setCelebrate(true);
      const timer = setTimeout(() => setCelebrate(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [streak]);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative">
        <Flame
          className={cn(
            sizeClasses[size],
            flameColor,
            animated && "animate-pulse",
            celebrate && "animate-bounce",
          )}
          fill="currentColor"
        />
        {celebrate && (
          <div className="absolute inset-0 animate-ping">
            <Flame
              className={cn(sizeClasses[size], flameColor)}
              fill="currentColor"
            />
          </div>
        )}
      </div>

      {showLabel && (
        <span className={cn("font-bold", flameColor, textSizeClasses[size])}>
          {streak} day{streak !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

export default StreakFlame;
