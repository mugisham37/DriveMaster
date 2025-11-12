"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Shield, Info } from "lucide-react";
import { VirtualSessionList } from "./VirtualSessionList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SessionManagementPage() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Update last updated timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setLastUpdated(new Date());
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const relativeTime = formatDistanceToNow(lastUpdated, { addSuffix: true });

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Active Sessions</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your active sessions across all devices. You can revoke access from any
          device at any time.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          For your security, we recommend revoking sessions from devices you no longer use
          or don&apos;t recognize. Your current session is marked with &quot;This device&quot;.
        </AlertDescription>
      </Alert>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Your Sessions</CardTitle>
              <CardDescription>
                Sessions are automatically refreshed every 30 seconds
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Updated {relativeTime}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                aria-label="Refresh sessions"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <VirtualSessionList 
            key={refreshKey} 
            autoRefresh={true} 
            refreshInterval={30000}
            enableVirtualScrolling={true}
            virtualScrollThreshold={20}
          />
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>
              Regularly review your active sessions and revoke any you don&apos;t recognize
            </li>
            <li>
              If you see suspicious activity, revoke all other sessions and change your
              password immediately
            </li>
            <li>
              Sessions automatically expire after a period of inactivity for your security
            </li>
            <li>
              Always sign out when using shared or public computers
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
