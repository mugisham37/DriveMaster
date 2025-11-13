"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Copy, Check, AlertCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface MFASetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetupComplete?: () => void;
}

interface SetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

export function MFASetupModal({ open, onOpenChange, onSetupComplete }: MFASetupModalProps) {
  const [step, setStep] = useState<"qr" | "verify" | "backup">("qr");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Simulate fetching setup data (replace with actual API call)
  const fetchSetupData = async () => {
    // TODO: Replace with actual API call to generate MFA setup
    return {
      qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/DriveMaster:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=DriveMaster",
      secret: "JBSWY3DPEHPK3PXP",
      backupCodes: [
        "1234-5678",
        "2345-6789",
        "3456-7890",
        "4567-8901",
        "5678-9012",
        "6789-0123",
        "7890-1234",
        "8901-2345"
      ]
    };
  };

  // Initialize setup data when modal opens
  useState(() => {
    if (open && !setupData) {
      fetchSetupData().then(setSetupData);
    }
  });

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      toast.success("Secret key copied to clipboard");
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // TODO: Replace with actual API call to verify MFA setup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate verification
      if (verificationCode === "123456") {
        setStep("backup");
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch {
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = `DriveMaster MFA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${setupData.backupCodes.join("\n")}\n\nKeep these codes in a safe place. Each code can only be used once.`;
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

  const handleCopyBackupCodes = async () => {
    if (!setupData?.backupCodes) return;

    await navigator.clipboard.writeText(setupData.backupCodes.join("\n"));
    setCopiedCodes(true);
    toast.success("Backup codes copied to clipboard");
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleComplete = () => {
    onSetupComplete?.();
    onOpenChange(false);
    // Reset state
    setStep("qr");
    setVerificationCode("");
    setError(null);
    setSetupData(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="mfa-setup-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Enable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription id="mfa-setup-description">
            {step === "qr" && "Scan the QR code with your authenticator app"}
            {step === "verify" && "Enter the verification code from your app"}
            {step === "backup" && "Save your backup codes in a secure location"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: QR Code Display */}
        {step === "qr" && setupData && (
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Card className="p-4">
                <CardContent className="p-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setupData.qrCodeUrl}
                    alt="MFA QR Code"
                    className="w-48 h-48"
                  />
                </CardContent>
              </Card>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app
                </p>
                <p className="text-xs text-muted-foreground">
                  (Google Authenticator, Authy, 1Password, etc.)
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="secret-key">Or enter this key manually:</Label>
              <div className="flex gap-2">
                <Input
                  id="secret-key"
                  value={setupData.secret}
                  readOnly
                  className="font-mono text-sm"
                  aria-label="Secret key for manual entry"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                  aria-label="Copy secret key"
                >
                  {copiedSecret ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure to save this secret key. You&apos;ll need it if you lose access to your authenticator app.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Verification */}
        {step === "verify" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Enter 6-digit code</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setVerificationCode(value);
                  setError(null);
                }}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                aria-label="Verification code"
                aria-invalid={!!error}
                aria-describedby={error ? "verification-error" : undefined}
                autoFocus
              />
              {error && (
                <p id="verification-error" className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Open your authenticator app and enter the 6-digit code shown for DriveMaster.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === "backup" && setupData && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Save these backup codes in a secure location. Each code can only be used once to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {setupData.backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCopyBackupCodes}
              >
                {copiedCodes ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Codes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleDownloadBackupCodes}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "qr" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setStep("verify")}
                disabled={!setupData}
              >
                Next
              </Button>
            </>
          )}

          {step === "verify" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("qr")}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleVerifyCode}
                disabled={isVerifying || verificationCode.length !== 6}
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
            </>
          )}

          {step === "backup" && (
            <Button
              type="button"
              onClick={handleComplete}
              className="w-full"
            >
              Complete Setup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
