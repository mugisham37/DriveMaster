"use client";

/**
 * Cross-Tab Synchronization Test Page
 * 
 * This page allows testing cross-tab authentication synchronization
 * Open this page in multiple tabs to test:
 * - Login synchronization (11.1)
 * - Logout synchronization (11.2)
 * - Profile update synchronization (11.3)
 * - Visual indicators (11.4)
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCrossTabSyncStatus } from "@/hooks/useCrossTabNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Info, RefreshCw } from "lucide-react";

export default function CrossTabSyncTestPage() {
  const {
    user,
    isAuthenticated,
    state,
    login,
    logout,
    updateProfile,
  } = useAuth();

  const isLoading = state.isLoading;
  const isLoginLoading = state.isLoginLoading;
  const isLogoutLoading = state.isLogoutLoading;
  const isProfileLoading = state.isProfileLoading;

  const syncStatus = useCrossTabSyncStatus();

  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [profileName, setProfileName] = useState("");
  const [lastEvent, setLastEvent] = useState<string>("");
  const [eventCount, setEventCount] = useState(0);

  // Update profile name when user changes
  useEffect(() => {
    if (user?.name) {
      setProfileName(user.name);
    }
  }, [user]);

  // Track authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setLastEvent(`Authenticated as ${user.email}`);
      setEventCount((prev) => prev + 1);
    } else if (!isAuthenticated && !isLoading) {
      setLastEvent("Not authenticated");
      setEventCount((prev) => prev + 1);
    }
  }, [isAuthenticated, user, isLoading]);

  const handleLogin = async () => {
    try {
      await login({ email, password });
      setLastEvent("Login successful");
    } catch (error) {
      setLastEvent(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLastEvent("Logout successful");
    } catch (error) {
      setLastEvent(`Logout failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      await updateProfile({ name: profileName });
      setLastEvent(`Profile updated: ${profileName}`);
    } catch (error) {
      setLastEvent(`Profile update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cross-Tab Synchronization Test</h1>
        <p className="text-muted-foreground">
          Open this page in multiple browser tabs to test cross-tab authentication synchronization.
          Actions performed in one tab should be reflected in all other tabs.
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Testing Instructions</AlertTitle>
        <AlertDescription>
          1. Open this page in 2-3 browser tabs<br />
          2. Perform login/logout/profile updates in one tab<br />
          3. Observe that all tabs update automatically<br />
          4. Check for toast notifications when events occur
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sync Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>Current cross-tab synchronization state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tab ID:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">{syncStatus.tabId}</code>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Initialized:</span>
              {syncStatus.isInitialized ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  No
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Supported:</span>
              {syncStatus.isSupported ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  No
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Has Channel:</span>
              {syncStatus.hasChannel ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Info className="h-3 w-3" />
                  Fallback Mode
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Listeners:</span>
              <Badge variant="outline">{syncStatus.listenerCount}</Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Event Count:</span>
              <Badge variant="outline">{eventCount}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Event:</span>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {lastEvent || "None"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Auth Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current user authentication state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Authenticated:</span>
              {isAuthenticated ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  No
                </Badge>
              )}
            </div>

            {user && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm text-muted-foreground">{user.name || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Handle:</span>
                    <span className="text-sm text-muted-foreground">@{user.handle}</span>
                  </div>
                  {user.isMentor && (
                    <Badge variant="default">Mentor</Badge>
                  )}
                  {user.isInsider && (
                    <Badge variant="secondary">Insider</Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Login Test Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test 11.1: Login Synchronization</CardTitle>
            <CardDescription>
              Login in this tab and verify other tabs update
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
                disabled={isAuthenticated}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                disabled={isAuthenticated}
              />
            </div>

            <Button
              onClick={handleLogin}
              disabled={isAuthenticated || isLoginLoading}
              className="w-full"
            >
              {isLoginLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Expected: All tabs should show authenticated state and display user info
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Logout Test Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test 11.2: Logout Synchronization</CardTitle>
            <CardDescription>
              Logout in this tab and verify other tabs logout too
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleLogout}
              disabled={!isAuthenticated || isLogoutLoading}
              variant="destructive"
              className="w-full"
            >
              {isLogoutLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Logout"
              )}
            </Button>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Expected: All tabs should clear authentication state and show logged out
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Profile Update Test Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Test 11.3: Profile Update Synchronization</CardTitle>
            <CardDescription>
              Update profile in this tab and verify other tabs reflect the change
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileName">Name</Label>
              <Input
                id="profileName"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter new name"
                disabled={!isAuthenticated}
              />
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={!isAuthenticated || isProfileLoading || !profileName}
              className="w-full"
            >
              {isProfileLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Expected: All tabs should show the updated name in the Auth Status card
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Test Results Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test 11.4: Visual Indicators</CardTitle>
          <CardDescription>
            Toast notifications should appear when events occur in other tabs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Expected Notifications</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              <div>• Login in another tab → &ldquo;Signed in from another tab&rdquo; (info toast)</div>
              <div>• Logout in another tab → &ldquo;Signed out from another tab&rdquo; (warning toast)</div>
              <div>• Session expired → &ldquo;Session expired&rdquo; (error toast)</div>
              <div>• Profile update → State updates automatically (no toast for profile updates)</div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
