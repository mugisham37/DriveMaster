/**
 * Connection Status Indicator Component
 * 
 * Displays the current WebSocket connection status with visual feedback.
 * Shows online/offline status and reconnection messages.
 */

"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusIndicatorProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  className?: string;
  showLabel?: boolean;
  onReconnect?: () => void;
}

export function ConnectionStatusIndicator({
  isConnected,
  isConnecting,
  error,
  className,
  showLabel = true,
  onReconnect,
}: ConnectionStatusIndicatorProps) {
  const getStatusConfig = () => {
    if (isConnecting) {
      return {
        icon: RefreshCw,
        label: "Reconnecting...",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-950",
        animate: true,
      };
    }

    if (error || !isConnected) {
      return {
        icon: WifiOff,
        label: "Connection lost",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950",
        animate: false,
      };
    }

    return {
      icon: Wifi,
      label: "Connected",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
      animate: false,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
        config.bgColor,
        className
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          config.color,
          config.animate && "animate-spin"
        )}
      />
      {showLabel && (
        <span className={cn("font-medium", config.color)}>
          {config.label}
        </span>
      )}
      {(error || !isConnected) && onReconnect && !isConnecting && (
        <button
          onClick={onReconnect}
          className={cn(
            "ml-2 text-xs underline hover:no-underline",
            config.color
          )}
          aria-label="Reconnect"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Compact version for header/footer
 */
export function ConnectionStatusDot({
  isConnected,
  isConnecting,
  className,
}: Pick<ConnectionStatusIndicatorProps, "isConnected" | "isConnecting" | "className">) {
  const getStatusColor = () => {
    if (isConnecting) return "bg-yellow-500 animate-pulse";
    if (!isConnected) return "bg-red-500";
    return "bg-green-500";
  };

  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full",
        getStatusColor(),
        className
      )}
      aria-label={
        isConnecting
          ? "Reconnecting"
          : isConnected
            ? "Connected"
            : "Disconnected"
      }
    />
  );
}
