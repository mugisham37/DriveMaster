"use client";

import { Shield, Key, Info, AlertTriangle } from "lucide-react";
import { PasswordChangeForm } from "../forms/PasswordChangeForm";
import { MFASettingsSection } from "../mfa/MFASettingsSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

export function PasswordChangePage() {
  const { state } = useAuth();
  
  // Check if MFA is supported (backend has mfaEnabled flag)
  const mfaSupported = state.user && 'mfaEnabled' in state.user;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mfaEnabled = mfaSupported && (state.user as any).mfaEnabled;

  // Mock data for MFA settings - replace with actual API calls
  const handleEnableMFA = async () => {
    // TODO: Implement actual API call to enable MFA
    console.log("Enable MFA");
  };

  const handleDisableMFA = async () => {
    // TODO: Implement actual API call to disable MFA
    console.log("Disable MFA");
  };

  const handleRegenerateBackupCodes = async (): Promise<string[]> => {
    // TODO: Implement actual API call to regenerate backup codes
    return [
      "1234-5678",
      "2345-6789",
      "3456-7890",
      "4567-8901",
      "5678-9012",
      "6789-0123",
      "7890-1234",
      "8901-2345"
    ];
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your password and security preferences to keep your account safe.
        </p>
      </div>

      {/* Security Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Changing your password will sign you out of all other devices. You&apos;ll need to
          sign in again on those devices with your new password.
        </AlertDescription>
      </Alert>

      {/* MFA Settings Section - Only show if backend supports MFA */}
      {mfaSupported && (
        <>
          <MFASettingsSection
            mfaEnabled={mfaEnabled}
            lastUsedAt={null}
            backupCodesCount={5}
            onEnableMFA={handleEnableMFA}
            onDisableMFA={handleDisableMFA}
            onRegenerateBackupCodes={handleRegenerateBackupCodes}
          />
          <Separator />
        </>
      )}

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>
            Update your password to keep your account secure. Use a strong, unique
            password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>

      {/* Password Requirements Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Password Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your password must meet the following requirements:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>At least 8 characters long</li>
            <li>Contains at least one uppercase letter (A-Z)</li>
            <li>Contains at least one lowercase letter (a-z)</li>
            <li>Contains at least one number (0-9)</li>
            <li>Should not be a commonly used password</li>
          </ul>
        </CardContent>
      </Card>

      <Separator />

      {/* Security Best Practices */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Security Best Practices</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Use a unique password:</strong> Don&apos;t reuse passwords from other
              websites
            </li>
            <li>
              <strong>Use a password manager:</strong> Consider using a password manager
              to generate and store strong passwords
            </li>
            <li>
              <strong>Change regularly:</strong> Update your password periodically,
              especially if you suspect unauthorized access
            </li>
            <li>
              <strong>Enable two-factor authentication:</strong> Add an extra layer of
              security to your account (if available)
            </li>
            <li>
              <strong>Be cautious of phishing:</strong> Never share your password via
              email or suspicious links
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
