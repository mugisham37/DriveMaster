"use client";

/**
 * ActivityItem - Molecular Component
 * 
 * Displays activity record with type icon, description, timestamp, and engagement.
 * Supports compact and detailed variants with expandable details.
 * 
 * Requirements: 12.3, 6.3
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ActivityRecord } from "@/types/user-service";

export interface ActivityItemProps {
  activity: ActivityRecord;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const activityIcons = {
  practice: BookOpen,
  assessment: Target,
  achievement: Trophy,
  milestone: CheckCircle2,
  default: BookOpen,
};

const activityColors = {
  practice: "text-blue-500 bg-blue-50",
  assessment: "text-purple-500 bg-purple-50",
  achievement: "text-yellow-500 bg-yellow-50",
  milestone: "text-green-500 bg-green-50",
  default: "text-gray-500 bg-gray-50",
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function getEngagementColor(score: number): string {
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.5) return "text-yellow-600";
  return "text-red-600";
}

export function ActivityItem({
  activity,
  showDetails: initialShowDetails = false,
  compact = false,
  className,
}: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(initialShowDetails);

  const activityType = activity.activityType || "default";
  const Icon = activityIcons[activityType as keyof typeof activityIcons] || activityIcons.default;
  const colorClass = activityColors[activityType as keyof typeof activityColors] || activityColors.default;
  
  const timestamp = new Date(activity.timestamp);
  const duration = activity.durationMs || 0;
  const engagementScore = 0; // Not available in ActivityRecord, would come from EngagementMetrics

  const hasExpandableContent = !compact && (
    activity.metadata ||
    activity.sessionId ||
    activity.deviceType
  );

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-all",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "rounded-full p-2 shrink-0",
          colorClass
        )}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Description */}
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "font-medium",
              compact ? "text-sm" : "text-base"
            )}>
              {activity.activityType.charAt(0).toUpperCase() + activity.activityType.slice(1)}
              {activity.metadata?.topic && typeof activity.metadata.topic === 'string' ? `: ${String(activity.metadata.topic)}` : ''}
            </p>
            {hasExpandableContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label={isExpanded ? "Collapse details" : "Expand details"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(timestamp)}</span>
          </div>

          {/* Stats */}
          {!compact && (
            <div className="flex items-center gap-4 text-xs">
              {duration > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(duration)}</span>
                </div>
              )}
              {engagementScore > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className={cn("h-3 w-3", getEngagementColor(engagementScore))} />
                  <span className={getEngagementColor(engagementScore)}>
                    {Math.round(engagementScore * 100)}% engagement
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Expanded Details */}
          {isExpanded && hasExpandableContent && (
            <div className="mt-3 pt-3 border-t space-y-2 text-xs">
              {activity.sessionId && (
                <div>
                  <span className="text-muted-foreground">Session: </span>
                  <span className="font-mono">{activity.sessionId.slice(0, 8)}...</span>
                </div>
              )}
              {activity.deviceType && (
                <div>
                  <span className="text-muted-foreground">Device: </span>
                  <span>{activity.platform || activity.deviceType}</span>
                </div>
              )}
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Details: </span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivityItem;
