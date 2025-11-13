"use client";

/**
 * Virtual Scrolling Session List Component
 * 
 * Implements virtual scrolling for efficient rendering of large session lists (100+ sessions)
 * Uses react-window for performance optimization
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 20.5
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, Loader2, Shield } from "lucide-react";

// Dynamic import for react-window to handle missing types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let List: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactWindow = require("react-window");
  List = ReactWindow.FixedSizeList;
} catch {
  console.warn("react-window not available, virtual scrolling disabled");
}
import { toast } from "sonner";
import { SessionCard } from "./SessionCard";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { profileSessionClient } from "@/lib/auth/profile-session-client";
import type { Session } from "@/types/auth-service";

interface VirtualSessionListProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enableVirtualScrolling?: boolean; // Toggle virtual scrolling
  virtualScrollThreshold?: number; // Number of sessions before enabling virtual scrolling
}

// Row height for virtual scrolling (in pixels)
const ROW_HEIGHT = 180;
const ROW_GAP = 16;
const TOTAL_ROW_HEIGHT = ROW_HEIGHT + ROW_GAP;

export function VirtualSessionList({
  autoRefresh = false,
  refreshInterval = 30000,
  enableVirtualScrolling = true,
  virtualScrollThreshold = 20,
}: VirtualSessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showBulkRevokeDialog, setShowBulkRevokeDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  // Calculate list height based on container
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        setListHeight(Math.max(400, containerHeight - 100));
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const response = await profileSessionClient.getSessions();
      
      // Sort sessions by last active (most recent first)
      const sortedSessions = [...response.sessions].sort((a, b) => {
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
      });
      
      setSessions(sortedSessions);
      
      console.log(`[Performance] Loaded ${sortedSessions.length} sessions. Virtual scrolling: ${shouldUseVirtualScrolling(sortedSessions.length)}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load sessions";
      setError(errorMessage);
      toast.error("Failed to load sessions", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSessions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSessions]);

  // Revoke individual session
  const handleRevokeSession = async (sessionId: string) => {
    setIsRevoking(true);
    try {
      await profileSessionClient.invalidateSession(sessionId);
      
      // Remove session from list immediately (optimistic update)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      
      toast.success("Session revoked", {
        description: "The session has been successfully revoked.",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to revoke session";
      toast.error("Failed to revoke session", {
        description: errorMessage,
      });
      
      // Refresh sessions to get accurate state
      await fetchSessions();
    } finally {
      setIsRevoking(false);
    }
  };

  // Revoke all other sessions
  const handleRevokeAllOthers = async () => {
    setIsRevoking(true);
    try {
      await profileSessionClient.invalidateAllOtherSessions();
      
      // Keep only current session (optimistic update)
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      
      setShowBulkRevokeDialog(false);
      toast.success("All other sessions revoked", {
        description: "You have been signed out of all other devices.",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to revoke sessions";
      toast.error("Failed to revoke sessions", {
        description: errorMessage,
      });
      
      // Refresh sessions to get accurate state
      await fetchSessions();
    } finally {
      setIsRevoking(false);
    }
  };

  // Manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    fetchSessions();
  };

  // Determine if virtual scrolling should be used
  const shouldUseVirtualScrolling = (count: number) => {
    return enableVirtualScrolling && count >= virtualScrollThreshold && List !== null;
  };

  // Count non-current sessions
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  // Row renderer for virtual list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const session = sessions[index];
    if (!session) return null;
    
    return (
      <div style={{ ...style, paddingBottom: `${ROW_GAP}px` }}>
        <SessionCard
          session={session}
          onRevoke={handleRevokeSession}
          isRevoking={isRevoking}
        />
      </div>
    );
  };

  // Loading state
  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading sessions...</p>
      </div>
    );
  }

  // Error state
  if (error && sessions.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-2"
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">No Active Sessions</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            You don&apos;t have any active sessions at the moment.
          </p>
        </div>
      </div>
    );
  }

  const useVirtualScrolling = shouldUseVirtualScrolling(sessions.length);

  return (
    <div ref={containerRef} className="space-y-6 h-full">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {sessions.length} active {sessions.length === 1 ? "session" : "sessions"}
          </p>
          {useVirtualScrolling && (
            <p className="text-xs text-muted-foreground">
              Virtual scrolling enabled for performance
            </p>
          )}
        </div>
        {otherSessionsCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkRevokeDialog(true)}
            disabled={isRevoking}
          >
            Revoke all other sessions ({otherSessionsCount})
          </Button>
        )}
      </div>

      {/* Session list - Virtual or Regular */}
      {useVirtualScrolling ? (
        <div className="border rounded-lg">
          <List
            ref={listRef}
            height={listHeight}
            itemCount={sessions.length}
            itemSize={TOTAL_ROW_HEIGHT}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          >
            {Row}
          </List>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onRevoke={handleRevokeSession}
              isRevoking={isRevoking}
            />
          ))}
        </div>
      )}

      {/* Bulk revoke confirmation dialog */}
      <AlertDialog
        open={showBulkRevokeDialog}
        onOpenChange={setShowBulkRevokeDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              Revoke All Other Sessions
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke all other sessions? This will sign you out
              of all devices except this one. You will need to sign in again on those
              devices.
              <br />
              <br />
              <strong>{otherSessionsCount} session{otherSessionsCount !== 1 ? "s" : ""} will be revoked.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllOthers}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? "Revoking..." : "Revoke All Other Sessions"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
