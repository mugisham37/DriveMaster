"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Shield, ShieldCheck, ShieldOff, RefreshCw, Download, AlertCircle, Check } from "lucide-react";
import { MFASetupModal } from "./MFASetupModal";
import { toast } from "sonner";
import { format } from "date-fns";

interface MFASettingsSectionProps {
  mfaEnabled: boolean;
  lastUsedAt?: string | null;
  backupCodesCount?: number;
  onEnableMFA?: () => Promise<void>;
  onDisableMFA?: () => Promise<void>;
  onRegenerateBackupCodes?: () => Promise<string[]>;
}

export function MFASettingsSection({
  mfaEnabled,
  lastUsedAt,
  backupCodesCount = 0,
  onEnableMFA,
  onDisableMFA,
  onRegenerateBackupCodes
}: MFASettingsSectionProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const handleEnableMFA = () => {
    setShowSetupModal(true);
  };

  const handleSetupComplete = async () => {
    try {
      await onEnableMFA?.();
      toast.success("Two-factor authentication enabled successfully");
    } catch (error) {
      toast.error("Failed to enable two-factor authentication");
    }
  };

  const handleDisableMFA = async () => {
    setIsDisabling(true);
    try {
      await onDisableMFA?.();
      toast.success("Two-factor authentication disabled");
      setShowDisableDialog(false);
    } catch (error) {
      toast.error("Failed to disable two-factor authentication");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setIsRegenerating(true);
    try {
      const codes = await onRegenerateBackupCodes?.();
      if (codes) {
        setNewBackupCodes(codes);
        toast.success("Backup codes regenerated successfully");
      }
    } catch (error) {
      toast.error("Failed to regenerate backup codes");
      setShowRegenerateDialog(false);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!newBackupCodes) return;

    const content = `DriveMaster MFA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${newBackupCodes.join("\n")}\n\nKeep these codes in a safe place. Each code can only be used once.\n\nIMPORTANT: Your old backup codes are now invalid.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drivemaster-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  const handleCloseRegenerateDialog = () => {
    setShowRegenerateDialog(false);
    setNewBackupCodes(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${mfaEnabled ? "bg-green-100 dark:bg-green-900/20" : "bg-muted"}`}>
                {mfaEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Shield className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge variant={mfaEnabled ? "default" : "secondary"}>
              {mfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!mfaEnabled ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Protect your account with two-factor authentication. You'll need to enter a code from your authenticator app when signing in.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleEnableMFA}
                className="w-full sm:w-auto"
              >
                <Shield className="mr-2 h-4 w-4" />
                Enable Two-Factor Authentication
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                {lastUsedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last used:</span>
                    <span className="font-medium">
                      {format(new Date(lastUsedAt), "PPp")}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Backup codes remaining:</span>
                  <Badge variant={backupCodesCount > 2 ? "secondary" : "destructive"}>
                    {backupCodesCount} / 8
                  </Badge>
                </div>

                {backupCodesCount <= 2 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You're running low on backup codes. Generate new ones to ensure you can access your account if you lose your authenticator device.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateDialog(true)}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate Backup Codes
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowDisableDialog(true)}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Disable MFA
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* MFA Setup Modal */}
      <MFASetupModal
        open={showSetupModal}
        onOpenChange={setShowSetupModal}
        onSetupComplete={handleSetupComplete}
      />

      {/* Disable MFA Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your account less secure. You'll only need your password to sign in.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableMFA}
              disabled={isDisabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisabling ? "Disabling..." : "Disable MFA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Backup Codes Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={handleCloseRegenerateDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {newBackupCodes ? "New Backup Codes Generated" : "Regenerate Backup Codes?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {newBackupCodes ? (
                "Save these new backup codes in a secure location. Your old codes are now invalid."
              ) : (
                "This will invalidate your existing backup codes and generate new ones. Make sure to save the new codes."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {newBackupCodes && (
            <div className="my-4">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {newBackupCodes.map((code, index) => (
                      <div key={index} className="p-2 bg-muted rounded text-center">
                        {code}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={handleDownloadBackupCodes}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Backup Codes
              </Button>
            </div>
          )}

          <AlertDialogFooter>
            {!newBackupCodes ? (
              <>
                <AlertDialogCancel disabled={isRegenerating}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRegenerateBackupCodes}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? "Generating..." : "Regenerate Codes"}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={handleCloseRegenerateDialog} className="w-full">
                <Check className="mr-2 h-4 w-4" />
                I've Saved My Codes
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
