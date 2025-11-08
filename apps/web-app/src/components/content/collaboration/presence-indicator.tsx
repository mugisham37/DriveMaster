/**
 * Presence Indicator Component
 *
 * Displays active users and their presence status for real-time collaboration.
 * Shows user avatars, names, and current activity status.
 *
 * Requirements: 9.3
 */

"use client";

import React from "react";
import Image from "next/image";
import { usePresenceTracking } from "@/hooks/use-real-time-content";
import type { UserPresence } from "@/types/websocket";

// ============================================================================
// Types
// ============================================================================

export interface PresenceIndicatorProps {
  itemId: string;
  enabled?: boolean;
  maxVisibleUsers?: number;
  showStatus?: boolean;
  showTooltips?: boolean;
  className?: string;
}

export interface UserAvatarProps {
  user: UserPresence;
  showStatus?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// User Avatar Component
// ============================================================================

export function UserAvatar({
  user,
  showStatus = true,
  showTooltip = true,
  size = "md",
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  const statusColors = {
    active: "bg-green-500",
    idle: "bg-yellow-500",
    away: "bg-gray-500",
    offline: "bg-gray-300",
  };

  const initials = user.displayName
    .split(" ")
    .map((name: string) => name.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarContent = (
    <div className="relative">
      {user.avatar ? (
        <Image
          src={user.avatar}
          alt={user.displayName}
          width={size === "sm" ? 32 : size === "md" ? 40 : 48}
          height={size === "sm" ? 32 : size === "md" ? 40 : 48}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-blue-500 text-white flex items-center justify-center font-medium`}
        >
          {initials}
        </div>
      )}

      {showStatus && (
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[user.status]}`}
          title={`${user.status.charAt(0).toUpperCase() + user.status.slice(1)}`}
        />
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <div
        className="relative group cursor-pointer"
        title={`${user.displayName} (${user.status})`}
      >
        {avatarContent}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          <div className="font-medium">{user.displayName}</div>
          <div className="text-gray-300 capitalize">{user.status}</div>
          {user.lastSeen && (
            <div className="text-gray-400 text-xs">
              Last seen: {new Date(user.lastSeen).toLocaleTimeString()}
            </div>
          )}

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    );
  }

  return avatarContent;
}

// ============================================================================
// Presence Indicator Component
// ============================================================================

export function PresenceIndicator({
  itemId,
  enabled = true,
  maxVisibleUsers = 5,
  showStatus = true,
  showTooltips = true,
  className = "",
}: PresenceIndicatorProps) {
  const { activeUsers, isTracking } = usePresenceTracking({
    itemId,
    enabled,
  });

  if (!enabled || !isTracking || activeUsers.length === 0) {
    return null;
  }

  const visibleUsers = activeUsers.slice(0, maxVisibleUsers);
  const hiddenCount = Math.max(0, activeUsers.length - maxVisibleUsers);

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {/* User avatars */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user: UserPresence) => (
          <UserAvatar
            key={user.userId}
            user={user}
            showStatus={showStatus}
            showTooltip={showTooltips}
            size="md"
          />
        ))}
      </div>

      {/* Hidden users count */}
      {hiddenCount > 0 && (
        <div
          className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-medium"
          title={`${hiddenCount} more user${hiddenCount > 1 ? "s" : ""}`}
        >
          +{hiddenCount}
        </div>
      )}

      {/* Active users count */}
      {showTooltips && (
        <span className="text-sm text-gray-500 ml-2">
          {activeUsers.length} active
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Presence Status Badge Component
// ============================================================================

export interface PresenceStatusBadgeProps {
  status: "active" | "idle" | "away" | "offline";
  showText?: boolean;
  className?: string;
}

export function PresenceStatusBadge({
  status,
  showText = false,
  className = "",
}: PresenceStatusBadgeProps) {
  const statusConfig = {
    active: {
      color: "bg-green-500",
      text: "Active",
      textColor: "text-green-700",
    },
    idle: {
      color: "bg-yellow-500",
      text: "Idle",
      textColor: "text-yellow-700",
    },
    away: {
      color: "bg-gray-500",
      text: "Away",
      textColor: "text-gray-700",
    },
    offline: {
      color: "bg-gray-300",
      text: "Offline",
      textColor: "text-gray-500",
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      {showText && (
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.text}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Detailed Presence List Component
// ============================================================================

export interface PresenceListProps {
  itemId: string;
  enabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function PresenceList({
  itemId,
  enabled = true,
  showDetails = true,
  className = "",
}: PresenceListProps) {
  const { activeUsers, isTracking } = usePresenceTracking({
    itemId,
    enabled,
  });

  if (!enabled || !isTracking) {
    return null;
  }

  if (activeUsers.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No active users
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-medium text-gray-700">
        Active Users ({activeUsers.length})
      </h4>

      <div className="space-y-1">
        {activeUsers.map((user: UserPresence) => (
          <div
            key={user.userId}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
          >
            <UserAvatar
              user={user}
              showStatus={true}
              showTooltip={false}
              size="sm"
            />

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.displayName}
              </div>

              {showDetails && (
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <PresenceStatusBadge status={user.status} showText={true} />

                  {user.lastSeen && (
                    <span>
                      Last seen: {new Date(user.lastSeen).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}

              {showDetails && user.currentPosition && (
                <div className="text-xs text-gray-400">
                  Line {user.currentPosition.line}, Column{" "}
                  {user.currentPosition.column}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Presence Indicator
// ============================================================================

export interface CompactPresenceIndicatorProps {
  itemId: string;
  enabled?: boolean;
  className?: string;
}

export function CompactPresenceIndicator({
  itemId,
  enabled = true,
  className = "",
}: CompactPresenceIndicatorProps) {
  const { activeUsers, isTracking } = usePresenceTracking({
    itemId,
    enabled,
  });

  if (!enabled || !isTracking || activeUsers.length === 0) {
    return null;
  }

  const activeCount = activeUsers.filter(
    (u: UserPresence) => u.status === "active",
  ).length;
  const idleCount = activeUsers.filter(
    (u: UserPresence) => u.status === "idle",
  ).length;
  const awayCount = activeUsers.filter(
    (u: UserPresence) => u.status === "away",
  ).length;

  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-gray-600">{activeCount}</span>
      </div>

      {idleCount > 0 && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-gray-600">{idleCount}</span>
        </div>
      )}

      {awayCount > 0 && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span className="text-gray-600">{awayCount}</span>
        </div>
      )}
    </div>
  );
}
