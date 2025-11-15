"use client";

/**
 * SkillMasteryItem - Molecular Component
 * 
 * Displays topic mastery with progress bar, practice stats, and last practiced time.
 * 
 * Requirements: 12.3, 5.2
 */

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { MasteryBadge } from "../atoms/MasteryBadge";
import { cn } from "@/lib/utils";
import { Clock, Target } from "lucide-react";

export interface SkillMasteryItemProps {
  topic: string;
  mastery: number; // 0-1
  practiceCount: number;
  lastPracticed: Date;
  timeSpent: number; // seconds
  onClick?: () => void;
  className?: string;
}

function getMasteryLevel(mastery: number): "beginner" | "intermediate" | "advanced" | "expert" {
  if (mastery >= 0.9) return "expert";
  if (mastery >= 0.7) return "advanced";
  if (mastery >= 0.4) return "intermediate";
  return "beginner";
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function formatTimeSpent(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function SkillMasteryItem({
  topic,
  mastery,
  practiceCount,
  lastPracticed,
  timeSpent,
  onClick,
  className,
}: SkillMasteryItemProps) {
  const masteryPercentage = Math.round(mastery * 100);
  const masteryLevel = getMasteryLevel(mastery);
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-4 transition-all",
        isClickable && "cursor-pointer hover:border-primary hover:shadow-md",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {topic}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <MasteryBadge
                level={masteryLevel}
                mastery={mastery}
                size="sm"
                showPercentage={false}
              />
              <span className="text-xs text-muted-foreground">
                {masteryPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress value={masteryPercentage} className="h-2" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>{practiceCount} practices</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTimeSpent(timeSpent)}</span>
          </div>
          <div className="ml-auto">
            <span>Last: {formatTimeAgo(lastPracticed)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkillMasteryItem;
