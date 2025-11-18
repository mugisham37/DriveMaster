"use client";

import React, { useState, useCallback } from "react";
import { Bell, CheckCircle, XCircle, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePushPermission } from "@/hooks/usePushPermission";
import { useDeviceTokens } from "@/hooks/useDeviceTokens";
import { useToast } from "@/hooks/use-toast";

export interface PushPermissionFlowProps {
  onComplete?: (token: string) => void;
  onSkip?: () => void;
  autoShow?: boolean;
  className?: string;
}

type FlowStep = "explanation" | "requesting" | "success" | "failure";

export function PushPermissionFlow({
  onComplete,
  onSkip,
  autoShow = false,
  className = "",
}: PushPermissionFlowProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(autoShow);
  const [step, setStep] = useState<FlowStep>("explanation");
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string>("");

  const { requestPermission, hasPermission, isSupported } = usePushPermission();
  const { registerToken } = useDeviceTokens("");

  const handleEnableNotifications = useCallback(async () => {
    if (!isSupported) {
      setStep("failure");
      return;
    }

    setStep("requesting");

    try {
      const granted = await requestPermission();

      if (granted) {
        // Generate FCM token (simulated here)
        const token = `fcm_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setGeneratedToken(token);

        // Register token with backend
        await registerToken.mutateAsync({
          userId: "", // Would come from auth context
          token,
          platform: "web",
          metadata: {
            userAgent: navigator.userAgent,
            browserName: getBrowserName(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
          },
        });

        setStep("success");
        onComplete?.(token);
      } else {
        setStep("failure");
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      setStep("failure");
    }
  }, [isSupported, requestPermission, registerToken, onComplete]);

  const handleSkip = useCallback(() => {
    if (dontAskAgain) {
      localStorage.setItem("push-permission-dismissed", "true");
    }
    setOpen(false);
    onSkip?.();
  }, [dontAskAgain, onSkip]);

  const handleTryAgain = useCallback(() => {
    setStep("explanation");
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const getBrowserName = (): string => {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Unknown";
  };

  const getPlatformInstructions = (): string => {
    const browser = getBrowserName();
    switch (browser) {
      case "Chrome":
        return "Click the lock icon in the address bar, then enable notifications.";
      case "Firefox":
        return "Click the lock icon in the address bar, then change notification permissions.";
      case "Safari":
        return "Go to Safari > Preferences > Websites > Notifications to enable.";
      case "Edge":
        return "Click the lock icon in the address bar, then enable notifications.";
      default:
        return "Check your browser settings to enable notifications.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={`sm:max-w-md ${className}`}>
        {/* Step 1: Explanation */}
        {step === "explanation" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Enable Push Notifications</DialogTitle>
              <DialogDescription className="text-center">
                Stay updated with your learning progress and never miss important reminders
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">Real-time Updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Get instant notifications about achievements, streaks, and reminders
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">Stay Motivated</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive timely reminders to maintain your learning streak
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">Customizable</h4>
                  <p className="text-sm text-muted-foreground">
                    Control which notifications you receive and when
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-ask"
                checked={dontAskAgain}
                onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
              />
              <Label
                htmlFor="dont-ask"
                className="text-sm font-normal cursor-pointer"
              >
                Don't ask me again
              </Label>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto">
                Not Now
              </Button>
              <Button onClick={handleEnableNotifications} className="w-full sm:w-auto">
                Enable Notifications
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Requesting */}
        {step === "requesting" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Bell className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <DialogTitle className="text-center">Requesting Permission</DialogTitle>
              <DialogDescription className="text-center">
                Please allow notifications in the browser prompt
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-sm text-muted-foreground">
                Waiting for your response...
              </p>
            </div>
          </>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <DialogTitle className="text-center">You're All Set!</DialogTitle>
              <DialogDescription className="text-center">
                This device will now receive push notifications
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-medium mb-2">You'll receive notifications for:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Achievement unlocks</li>
                  <li>• Streak reminders</li>
                  <li>• Spaced repetition reviews</li>
                  <li>• Mock test reminders</li>
                  <li>• Important system updates</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                You can customize these settings anytime in your preferences
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Got It
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Failure */}
        {step === "failure" && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center">Permission Denied</DialogTitle>
              <DialogDescription className="text-center">
                Notifications are currently blocked for this site
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <h4 className="font-medium">How to Enable Notifications</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getPlatformInstructions()}
                </p>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                You can still use the app, but you won't receive real-time notifications
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto">
                Skip for Now
              </Button>
              <Button onClick={handleTryAgain} className="w-full sm:w-auto">
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PushPermissionFlow;
