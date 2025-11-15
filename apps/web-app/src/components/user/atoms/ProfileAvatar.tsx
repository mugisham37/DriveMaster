"use client";

/**
 * ProfileAvatar - Atomic Component
 * 
 * Displays user avatar with optional online status indicator.
 * Supports multiple sizes and handles missing images with initials fallback.
 * 
 * Requirements: 12.2
 */

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface ProfileAvatarProps {
  src?: string | undefined;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "away";
  showStatus?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  away: "bg-yellow-500",
};

const statusSizes = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
  xl: "h-5 w-5",
};

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] || "?").charAt(0).toUpperCase();
  return ((parts[0] || "").charAt(0) + (parts[parts.length - 1] || "").charAt(0)).toUpperCase();
}

export function ProfileAvatar({
  src,
  alt,
  size = "md",
  status,
  showStatus = false,
  className,
  onClick,
}: ProfileAvatarProps) {
  const initials = getInitials(alt || "User");
  const isClickable = !!onClick;

  const avatarElement = (
    <Avatar
      className={cn(
        sizeClasses[size],
        isClickable && "cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
      )}
      onClick={onClick}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? "button" : undefined}
      aria-label={isClickable ? `Change ${alt || "user"}'s avatar` : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      <AvatarImage src={src} alt={alt || "User avatar"} />
      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <div className={cn("relative inline-block", className)}>
      {avatarElement}

      {showStatus && status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-white",
            statusColors[status],
            statusSizes[size],
          )}
          role="img"
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

export default ProfileAvatar;
