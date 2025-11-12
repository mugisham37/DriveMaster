"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, AlertCircle, HelpCircle } from "lucide-react";
import Link from "next/link";

interface MFAVerificationFormProps {
  onVerify: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel?: () => void;
  error?: string | null;
  isLoading?: boolean;
}

export function MFAVerificationForm({
  onVerify,
  onCancel,
  error: externalError,
  isLoading = false
}: MFAVerificationFormProps) {
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = externalError || localError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (useBackupCode) {
      if (!code || code.length < 8) {
        setLocalError("Please enter a valid backup code");
        return;
      }
    } else {
      if (!code || code.length !== 6) {
        setLocalError("Please enter a 6-digit code");
        return;
      }
    }

    try {
      await onVerify(code, useBackupCode);
    } catch {
      // Error handling is done by parent component
    }
  };

  const handleCodeChange = (value: string) => {
    if (useBackupCode) {
      // Allow alphanumeric and hyphens for backup codes
      const sanitized = value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
      setCode(sanitized);
    } else {
      // Only allow digits for verification codes
      const sanitized = value.replace(/\D/g, "");
      setCode(sanitized);
    }
    setLocalError(null);
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setCode("");
    setLocalError(null);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">
          Two-Factor Authentication
        </CardTitle>
        <CardDescription className="text-center">
          {useBackupCode
            ? "Enter one of your backup codes"
            : "Enter the 6-digit code from your authenticator app"}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">
              {useBackupCode ? "Backup Code" : "Verification Code"}
            </Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode={useBackupCode ? "text" : "numeric"}
              pattern={useBackupCode ? undefined : "[0-9]*"}
              maxLength={useBackupCode ? 20 : 6}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
              className={`text-center ${useBackupCode ? "text-lg" : "text-2xl tracking-widest"} font-mono`}
              aria-label={useBackupCode ? "Backup code" : "Verification code"}
              aria-invalid={!!error}
              aria-describedby={error ? "mfa-error" : undefined}
              disabled={isLoading}
              autoFocus
              autoComplete="off"
            />
            {error && (
              <div id="mfa-error" className="flex items-start gap-2 text-sm text-destructive" role="alert">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {!useBackupCode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Open your authenticator app and enter the current 6-digit code for DriveMaster.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-sm"
              onClick={toggleBackupCode}
              disabled={isLoading}
            >
              {useBackupCode
                ? "Use authenticator app instead"
                : "Use backup code instead"}
            </Button>

            <Link
              href="/help/mfa-lost-access"
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              Lost access to your authenticator?
            </Link>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || (useBackupCode ? code.length < 8 : code.length !== 6)}
            aria-busy={isLoading}
          >
            {isLoading ? "Verifying..." : "Verify"}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
