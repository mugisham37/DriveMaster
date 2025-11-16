"use client";

/**
 * Cached Content Indicator Component
 * 
 * Displays an indicator when viewing cached content while offline.
 * 
 * Requirements: 11.2
 * Task: 12.3
 */

import { Database, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CachedContentIndicatorProps {
  className?: string;
  variant?: "badge" | "banner" | "inline";
  cachedAt?: Date;
  showTimestamp?: boolean;
}

export function CachedContentIndicator({
  className,
  variant = "badge",
  cachedAt,
  showTimestamp = true,
}: CachedContentIndicatorProps) {
  const formatCachedTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return "just now";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }
  };

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <Database className="h-3 w-3" aria-hidden="true" />
        <span>Cached Content</span>
        {showTimestamp && cachedAt && (
          <>
            <span className="text-blue-600 dark:text-blue-500">•</span>
            <span className="text-blue-700 dark:text-blue-400">
              {formatCachedTime(cachedAt)}
            </span>
          </>
        )}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Viewing Cached Content
          </p>
          {showTimestamp && cachedAt && (
            <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
              Last updated {formatCachedTime(cachedAt)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Database className="h-4 w-4" aria-hidden="true" />
      <span>Cached content</span>
      {showTimestamp && cachedAt && (
        <>
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span className="text-xs">{formatCachedTime(cachedAt)}</span>
        </>
      )}
    </div>
  );
}

/**
 * Wrapper component that conditionally shows cached indicator
 */
export interface WithCachedIndicatorProps {
  children: React.ReactNode;
  isCached: boolean;
  cachedAt?: Date;
  className?: string;
  indicatorPosition?: "top" | "bottom";
}

export function WithCachedIndicator({
  children,
  isCached,
  cachedAt,
  className,
  indicatorPosition = "top",
}: WithCachedIndicatorProps) {
  if (!isCached) {
    return <>{children}</>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {indicatorPosition === "top" && cachedAt && (
        <CachedContentIndicator variant="banner" cachedAt={cachedAt} />
      )}
      {indicatorPosition === "top" && !cachedAt && (
        <CachedContentIndicator variant="banner" />
      )}
      {children}
      {indicatorPosition === "bottom" && cachedAt && (
        <CachedContentIndicator variant="banner" cachedAt={cachedAt} />
      )}
      {indicatorPosition === "bottom" && !cachedAt && (
        <CachedContentIndicator variant="banner" />
      )}
    </div>
  );
}
