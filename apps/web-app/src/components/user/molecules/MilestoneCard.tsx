"use client";

/**
 * MilestoneCard - Molecular Component
 * 
 * Displays achievement/milestone with progress, celebration animation, and unlock criteria.
 * 
 * Requirements: 12.3, 5.5
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Star,
  Target,
  Award,
  Lock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Milestone } from "@/types/user-service";

export interface MilestoneCardProps {
  milestone: Milestone;
  showProgress?: boolean;
  variant?: "default" | "achieved" | "locked";
  className?: string;
}

const milestoneIcons = {
  streak: Trophy,
  mastery: Star,
  practice: Target,
  achievement: Award,
  default: Trophy,
};

const variantStyles = {
  default: {
    card: "border-border bg-card",
    icon: "text-blue-500 bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
  },
  achieved: {
    card: "border-green-500 bg-gradient-to-br from-green-50 to-yellow-50 shadow-lg",
    icon: "text-green-600 bg-green-100",
    badge: "bg-green-100 text-green-800",
  },
  locked: {
    card: "border-muted bg-muted/30 opacity-75",
    icon: "text-muted-foreground bg-muted",
    badge: "bg-muted text-muted-foreground",
  },
};

export function MilestoneCard({
  milestone,
  showProgress = true,
  variant = "default",
  className,
}: MilestoneCardProps) {
  const [showCelebration, setShowCelebration] = React.useState(false);

  // Determine variant based on milestone status if not explicitly set
  const effectiveVariant = React.useMemo(() => {
    if (variant !== "default") return variant;
    if (milestone.achieved) return "achieved";
    // locked property doesn't exist in Milestone type, use progress === 0 as proxy
    if (milestone.progress === 0) return "locked";
    return "default";
  }, [variant, milestone.achieved, milestone.progress]);

  const styles = variantStyles[effectiveVariant];
  
  const milestoneType = milestone.type || "default";
  const Icon = milestoneIcons[milestoneType as keyof typeof milestoneIcons] || milestoneIcons.default;

  const progress = milestone.value || 0;
  const target = milestone.target || 100;
  const progressPercentage = Math.min(100, Math.round((progress / target) * 100));
  const isLocked = milestone.progress === 0;

  // Show celebration animation when milestone is achieved
  React.useEffect(() => {
    if (milestone.achieved && !milestone.achievedAt) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [milestone.achieved, milestone.achievedAt]);

  return (
    <Card className={cn("relative overflow-hidden transition-all", styles.card, className)}>
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/50 via-green-200/50 to-blue-200/50 animate-pulse" />
          <div className="absolute top-2 right-2 animate-bounce">
            <Sparkles className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="absolute bottom-2 left-2 animate-bounce delay-100">
            <Sparkles className="h-5 w-5 text-green-500" />
          </div>
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn("rounded-full p-3 shrink-0", styles.icon)}>
            {isLocked ? (
              <Lock className="h-5 w-5" />
            ) : milestone.achieved ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title and Badge */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm leading-tight">
                  {milestone.title}
                </h4>
                {milestone.achieved && (
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                    styles.badge
                  )}>
                    Achieved
                  </span>
                )}
              </div>
              {milestone.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {milestone.description}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            {showProgress && !milestone.achieved && !isLocked && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {progress} / {target}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}

            {/* Unlock Criteria - using description as unlock criteria */}
            {isLocked && milestone.description && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Unlock: </span>
                {milestone.description}
              </div>
            )}

            {/* Achievement Date */}
            {milestone.achieved && milestone.achievedAt && (
              <div className="text-xs text-muted-foreground">
                Achieved on {new Date(milestone.achievedAt).toLocaleDateString()}
              </div>
            )}

            {/* Points/Value as Reward */}
            {milestone.achieved && milestone.value > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Award className="h-3 w-3 text-yellow-600" />
                <span className="text-yellow-600 font-medium">
                  {milestone.value} points
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MilestoneCard;
