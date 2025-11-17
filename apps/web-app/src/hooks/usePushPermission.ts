/**
 * Push Permission Management Hook
 *
 * Provides hooks for browser notification permission management,
 * FCM token generation, and service worker verification.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// Permission State Types
// ============================================================================

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported"
  | "checking";

export interface PermissionFlowStep {
  step: number;
  title: string;
  description: string;
  action?: string;
}

// ============================================================================
// Push Permission Hook
// ============================================================================

export interface UsePushPermissionOptions {
  autoRequest?: boolean;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export interface UsePushPermissionResult {
  permission: NotificationPermissionState;
  isSupported: boolean;
  canRequest: boolean;
  isRequesting: boolean;
  requestPermission: () => Promise<NotificationPermissionState>;
  checkPermission: () => NotificationPermissionState;
  openSystemSettings: () => void;
}

/**
 * Hook for managing browser notification permissions
 * Requirements: 7.1, 7.2, 7.3
 */
export function usePushPermission(
  options: UsePushPermissionOptions = {},
): UsePushPermissionResult {
  const { autoRequest = false, onPermissionGranted, onPermissionDenied } =
    options;

  const [permission, setPermission] =
    useState<NotificationPermissionState>("checking");
  const [isSupported, setIsSupported] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const hasAutoRequested = useRef(false);

  // Check if notifications are supported
  const checkSupport = useCallback((): boolean => {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  }, []);

  // Check current permission state
  const checkPermission = useCallback((): NotificationPermissionState => {
    if (!checkSupport()) {
      return "unsupported";
    }

    return Notification.permission as NotificationPermissionState;
  }, [checkSupport]);

  // Request notification permission
  const requestPermission =
    useCallback(async (): Promise<NotificationPermissionState> => {
      if (!isSupported) {
        return "unsupported";
      }

      if (permission === "granted") {
        return "granted";
      }

      if (permission === "denied") {
        return "denied";
      }

      setIsRequesting(true);

      try {
        const result = await Notification.requestPermission();
        const newPermission = result as NotificationPermissionState;

        setPermission(newPermission);

        // Call callbacks
        if (newPermission === "granted" && onPermissionGranted) {
          onPermissionGranted();
        } else if (newPermission === "denied" && onPermissionDenied) {
          onPermissionDenied();
        }

        return newPermission;
      } catch (error) {
        console.error("Failed to request notification permission:", error);
        return "denied";
      } finally {
        setIsRequesting(false);
      }
    }, [
      isSupported,
      permission,
      onPermissionGranted,
      onPermissionDenied,
    ]);

  // Open system settings (platform-specific)
  const openSystemSettings = useCallback(() => {
    // This is a best-effort approach as there's no standard API
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes("chrome")) {
      alert(
        "To enable notifications:\n1. Click the lock icon in the address bar\n2. Find 'Notifications' in the permissions list\n3. Change it to 'Allow'",
      );
    } else if (userAgent.includes("firefox")) {
      alert(
        "To enable notifications:\n1. Click the lock icon in the address bar\n2. Click 'More Information'\n3. Go to the 'Permissions' tab\n4. Find 'Receive Notifications' and change to 'Allow'",
      );
    } else if (userAgent.includes("safari")) {
      alert(
        "To enable notifications:\n1. Open Safari Preferences\n2. Go to the 'Websites' tab\n3. Select 'Notifications' from the left sidebar\n4. Find this website and change to 'Allow'",
      );
    } else {
      alert(
        "To enable notifications, please check your browser settings and allow notifications for this website.",
      );
    }
  }, []);

  // Initialize permission state
  useEffect(() => {
    const supported = checkSupport();
    setIsSupported(supported);

    if (supported) {
      const currentPermission = checkPermission();
      setPermission(currentPermission);

      // Listen for permission changes (some browsers support this)
      if ("permissions" in navigator) {
        navigator.permissions
          .query({ name: "notifications" as PermissionName })
          .then((permissionStatus) => {
            const handleChange = () => {
              const newPermission = checkPermission();
              setPermission(newPermission);
            };

            permissionStatus.addEventListener("change", handleChange);

            return () => {
              permissionStatus.removeEventListener("change", handleChange);
            };
          })
          .catch(() => {
            // Fallback for browsers that don't support permission queries
          });
      }
    } else {
      setPermission("unsupported");
    }
  }, [checkSupport, checkPermission]);

  // Auto-request if enabled
  useEffect(() => {
    if (
      autoRequest &&
      !hasAutoRequested.current &&
      permission === "default" &&
      isSupported
    ) {
      hasAutoRequested.current = true;
      requestPermission();
    }
  }, [autoRequest, permission, isSupported, requestPermission]);

  const canRequest = isSupported && permission === "default";

  return {
    permission,
    isSupported,
    canRequest,
    isRequesting,
    requestPermission,
    checkPermission,
    openSystemSettings,
  };
}

// ============================================================================
// Service Worker Verification Hook
// ============================================================================

export interface UseServiceWorkerVerificationResult {
  isServiceWorkerReady: boolean;
  isServiceWorkerSupported: boolean;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  registerServiceWorker: (scriptUrl?: string) => Promise<ServiceWorkerRegistration>;
  unregisterServiceWorker: () => Promise<boolean>;
  updateServiceWorker: () => Promise<void>;
}

/**
 * Hook for service worker verification and management
 * Requirements: 7.4, 7.5
 */
export function useServiceWorkerVerification(): UseServiceWorkerVerificationResult {
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [isServiceWorkerSupported, setIsServiceWorkerSupported] =
    useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // Check if service workers are supported
  useEffect(() => {
    const supported =
      typeof window !== "undefined" && "serviceWorker" in navigator;
    setIsServiceWorkerSupported(supported);

    if (supported) {
      // Check if service worker is already registered
      navigator.serviceWorker.ready
        .then((registration) => {
          setServiceWorkerRegistration(registration);
          setIsServiceWorkerReady(true);
        })
        .catch((error) => {
          console.error("Service worker not ready:", error);
        });
    }
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(
    async (scriptUrl: string = "/sw.js"): Promise<ServiceWorkerRegistration> => {
      if (!isServiceWorkerSupported) {
        throw new Error("Service workers are not supported");
      }

      try {
        const registration = await navigator.serviceWorker.register(scriptUrl, {
          scope: "/",
        });

        setServiceWorkerRegistration(registration);
        setIsServiceWorkerReady(true);

        return registration;
      } catch (error) {
        console.error("Failed to register service worker:", error);
        throw error;
      }
    },
    [isServiceWorkerSupported],
  );

  // Unregister service worker
  const unregisterServiceWorker = useCallback(async (): Promise<boolean> => {
    if (!serviceWorkerRegistration) {
      return false;
    }

    try {
      const success = await serviceWorkerRegistration.unregister();
      if (success) {
        setServiceWorkerRegistration(null);
        setIsServiceWorkerReady(false);
      }
      return success;
    } catch (error) {
      console.error("Failed to unregister service worker:", error);
      return false;
    }
  }, [serviceWorkerRegistration]);

  // Update service worker
  const updateServiceWorker = useCallback(async (): Promise<void> => {
    if (!serviceWorkerRegistration) {
      throw new Error("No service worker registered");
    }

    try {
      await serviceWorkerRegistration.update();
    } catch (error) {
      console.error("Failed to update service worker:", error);
      throw error;
    }
  }, [serviceWorkerRegistration]);

  return {
    isServiceWorkerReady,
    isServiceWorkerSupported,
    serviceWorkerRegistration,
    registerServiceWorker,
    unregisterServiceWorker,
    updateServiceWorker,
  };
}

// ============================================================================
// Permission Flow Hook
// ============================================================================

export interface UsePermissionFlowResult {
  currentStep: number;
  steps: PermissionFlowStep[];
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  resetFlow: () => void;
  completeFlow: () => void;
  isFlowComplete: boolean;
}

/**
 * Hook for managing multi-step permission flow
 * Requirements: 7.1, 7.2, 7.3
 */
export function usePermissionFlow(): UsePermissionFlowResult {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFlowComplete, setIsFlowComplete] = useState(false);

  const steps: PermissionFlowStep[] = [
    {
      step: 0,
      title: "Stay Updated",
      description:
        "Enable notifications to receive important updates about your learning progress, achievements, and reminders.",
      action: "Continue",
    },
    {
      step: 1,
      title: "Grant Permission",
      description:
        "Click 'Allow' when your browser asks for notification permission.",
      action: "Request Permission",
    },
    {
      step: 2,
      title: "All Set!",
      description:
        "You'll now receive notifications for achievements, reminders, and important updates.",
      action: "Done",
    },
  ];

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const previousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
      }
    },
    [steps.length],
  );

  const resetFlow = useCallback(() => {
    setCurrentStep(0);
    setIsFlowComplete(false);
  }, []);

  const completeFlow = useCallback(() => {
    setIsFlowComplete(true);
  }, []);

  return {
    currentStep,
    steps,
    nextStep,
    previousStep,
    goToStep,
    resetFlow,
    completeFlow,
    isFlowComplete,
  };
}

// ============================================================================
// Platform Detection Hook
// ============================================================================

export interface UsePlatformDetectionResult {
  platform: "ios" | "android" | "web" | "unknown";
  browser: string;
  browserVersion: string;
  isMobile: boolean;
  supportsNotifications: boolean;
  getPlatformInstructions: () => string;
}

/**
 * Hook for detecting platform and providing platform-specific instructions
 * Requirements: 7.4, 7.5
 */
export function usePlatformDetection(): UsePlatformDetectionResult {
  const [platform, setPlatform] = useState<
    "ios" | "android" | "web" | "unknown"
  >("unknown");
  const [browser, setBrowser] = useState("Unknown");
  const [browserVersion, setBrowserVersion] = useState("Unknown");
  const [isMobile, setIsMobile] = useState(false);
  const [supportsNotifications, setSupportsNotifications] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent.toLowerCase();

    // Detect platform
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
      setIsMobile(true);
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
      setIsMobile(true);
    } else {
      setPlatform("web");
      setIsMobile(/mobile/.test(userAgent));
    }

    // Detect browser
    if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
      setBrowser("Chrome");
      const match = userAgent.match(/chrome\/(\d+)/);
      if (match) setBrowserVersion(match[1]);
    } else if (userAgent.includes("firefox")) {
      setBrowser("Firefox");
      const match = userAgent.match(/firefox\/(\d+)/);
      if (match) setBrowserVersion(match[1]);
    } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
      setBrowser("Safari");
      const match = userAgent.match(/version\/(\d+)/);
      if (match) setBrowserVersion(match[1]);
    } else if (userAgent.includes("edg")) {
      setBrowser("Edge");
      const match = userAgent.match(/edg\/(\d+)/);
      if (match) setBrowserVersion(match[1]);
    }

    // Check notification support
    setSupportsNotifications(
      "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window,
    );
  }, []);

  const getPlatformInstructions = useCallback((): string => {
    switch (browser) {
      case "Chrome":
        return "Click the lock icon in the address bar, then find 'Notifications' and change it to 'Allow'.";
      case "Firefox":
        return "Click the lock icon, then 'More Information', go to 'Permissions' tab, and allow notifications.";
      case "Safari":
        return "Open Safari Preferences > Websites > Notifications, find this site and change to 'Allow'.";
      case "Edge":
        return "Click the lock icon in the address bar, find 'Notifications' and change it to 'Allow'.";
      default:
        return "Check your browser settings and allow notifications for this website.";
    }
  }, [browser]);

  return {
    platform,
    browser,
    browserVersion,
    isMobile,
    supportsNotifications,
    getPlatformInstructions,
  };
}
