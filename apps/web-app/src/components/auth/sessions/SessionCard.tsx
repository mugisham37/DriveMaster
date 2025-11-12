"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Session } from "@/types/auth-service";

interface SessionCardProps {
  session: Session;
  onRevoke: (sessionId: string) => Promise<void>;
  isRevoking?: boolean;
}

/**
 * Parse user agent string to extract device, browser, and OS information
 */
function parseUserAgent(userAgent: string): {
  deviceType: "desktop" | "mobile" | "tablet";
  browserName: string;
  osName: string;
} {
  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (/tablet|ipad/i.test(userAgent)) {
    deviceType = "tablet";
  } else if (/mobile|android|iphone/i.test(userAgent)) {
    deviceType = "mobile";
  }

  // Detect browser
  let browserName = "Unknown Browser";
  if (ua.includes("edg/")) {
    browserName = "Edge";
  } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
    browserName = "Chrome";
  } else if (ua.includes("firefox/")) {
    browserName = "Firefox";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browserName = "Safari";
  } else if (ua.includes("opera/") || ua.includes("opr/")) {
    browserName = "Opera";
  }

  // Detect OS
  let osName = "Unknown OS";
  if (ua.includes("windows")) {
    osName = "Windows";
  } else if (ua.includes("mac os x")) {
    osName = "macOS";
  } else if (ua.includes("linux")) {
    osName = "Linux";
  } else if (ua.includes("android")) {
    osName = "Android";
  } else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) {
    osName = "iOS";
  }

  return { deviceType, browserName, osName };
}

/**
 * Get device icon based on device type
 */
function getDeviceIcon(deviceType: "desktop" | "mobile" | "tablet") {
  switch (deviceType) {
    case "mobile":
      return Smartphone;
    case "tablet":
      return Tablet;
    case "desktop":
    default:
      return Monitor;
  }
}

export function SessionCard({ session, onRevoke, isRevoking = false }: SessionCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRevokingLocal, setIsRevokingLocal] = useState(false);

  const { deviceType, browserName, osName } = parseUserAgent(session.userAgent);
  const DeviceIcon = getDeviceIcon(deviceType);

  const handleRevoke = async () => {
    setIsRevokingLocal(true);
    try {
      await onRevoke(session.id);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error("Failed to revoke session:", error);
    } finally {
      setIsRevokingLocal(false);
    }
  };

  const relativeTime = formatDistanceToNow(new Date(session.lastActiveAt), {
    addSuffix: true,
  });

  return (
    <>
      <Card className="relative">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              {/* Device Icon */}
              <div className="flex-shrink-0 mt-1">
                <DeviceIcon
                  className="h-6 w-6 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>

              {/* Session Details */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Browser and OS */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base">
                    {browserName} on {osName}
                  </h3>
                  {session.isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      This device
                    </Badge>
                  )}
                </div>

                {/* Location */}
                {session.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span>{session.location}</span>
                  </div>
                )}

                {/* IP Address */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{session.ipAddress}</span>
                </div>

                {/* Last Active */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Last active {relativeTime}</span>
                </div>
              </div>
            </div>

            {/* Revoke Button */}
            {!session.isCurrent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                disabled={isRevoking || isRevokingLocal}
                aria-label={`Revoke session from ${browserName} on ${osName}`}
              >
                {isRevokingLocal ? "Revoking..." : "Revoke"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Revoke Session
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this session? This will sign out the device
              using {browserName} on {osName}.
              {session.location && ` Located in ${session.location}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevokingLocal}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevokingLocal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevokingLocal ? "Revoking..." : "Revoke Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
