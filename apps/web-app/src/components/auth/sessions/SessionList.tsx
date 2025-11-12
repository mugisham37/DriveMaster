"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Loader2, Shield } from "lucide-react";
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

interface SessionListProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function SessionList({
  autoRefresh = false,
  refreshInterval = 30000,
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showBulkRevokeDialog, setShowBulkRevokeDialog] = useState(false);

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      setError(null);
      const response = await profileSessionClient.getSessions();
      
      // Sort sessions by last active (most recent first)
      const sortedSessions = [...response.sessions].sort((a, b) => {
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
      });
      
      setSessions(sortedSessions);
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
  };

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSessions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

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

  // Count non-current sessions
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

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

  return (
    <div className="space-y-6">
      {/* Header with bulk actions */}
      {otherSessionsCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {sessions.length} active {sessions.length === 1 ? "session" : "sessions"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkRevokeDialog(true)}
            disabled={isRevoking}
          >
            Revoke all other sessions ({otherSessionsCount})
          </Button>
        </div>
      )}

      {/* Session cards */}
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
