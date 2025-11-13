/**
 * Toast Notification Utilities
 * Centralized toast notifications for authentication flows using Sonner
 */

import { toast } from "sonner";

/**
 * Success toast notifications
 */
export const successToasts = {
  login: () =>
    toast.success("Welcome back!", {
      description: "You've successfully signed in to your account.",
      duration: 3000,
    }),

  register: () =>
    toast.success("Account created!", {
      description: "Welcome to DriveMaster. Let's get started!",
      duration: 4000,
    }),

  logout: () =>
    toast.success("Signed out", {
      description: "You've been successfully signed out.",
      duration: 2000,
    }),

  profileUpdate: () =>
    toast.success("Profile updated", {
      description: "Your changes have been saved successfully.",
      duration: 3000,
    }),

  avatarUpload: () =>
    toast.success("Avatar updated", {
      description: "Your profile picture has been updated.",
      duration: 3000,
    }),

  passwordChange: () =>
    toast.success("Password changed", {
      description: "Your password has been updated successfully.",
      duration: 3000,
    }),

  passwordReset: () =>
    toast.success("Password reset", {
      description: "Your password has been reset. You can now sign in.",
      duration: 4000,
    }),

  emailSent: (email: string) =>
    toast.success("Email sent", {
      description: `We've sent instructions to ${email}.`,
      duration: 4000,
    }),

  emailVerified: () =>
    toast.success("Email verified", {
      description: "Your email address has been verified successfully.",
      duration: 3000,
    }),

  sessionRevoked: () =>
    toast.success("Session revoked", {
      description: "The session has been terminated successfully.",
      duration: 2000,
    }),

  allSessionsRevoked: (count: number) =>
    toast.success("Sessions revoked", {
      description: `${count} session${count !== 1 ? "s" : ""} have been terminated.`,
      duration: 3000,
    }),

  providerLinked: (provider: string) =>
    toast.success("Account linked", {
      description: `Your ${provider} account has been linked successfully.`,
      duration: 3000,
    }),

  providerUnlinked: (provider: string) =>
    toast.success("Account unlinked", {
      description: `Your ${provider} account has been unlinked.`,
      duration: 2000,
    }),

  mfaEnabled: () =>
    toast.success("2FA enabled", {
      description: "Two-factor authentication has been enabled for your account.",
      duration: 4000,
    }),

  mfaDisabled: () =>
    toast.success("2FA disabled", {
      description: "Two-factor authentication has been disabled.",
      duration: 3000,
    }),

  preferencesUpdated: () =>
    toast.success("Preferences saved", {
      description: "Your preferences have been updated.",
      duration: 2000,
    }),
};

/**
 * Error toast notifications
 */
export const errorToasts = {
  loginFailed: (message?: string) =>
    toast.error("Sign in failed", {
      description: message || "Invalid email or password. Please try again.",
      duration: 4000,
    }),

  registerFailed: (message?: string) =>
    toast.error("Registration failed", {
      description: message || "Unable to create account. Please try again.",
      duration: 4000,
    }),

  networkError: () =>
    toast.error("Connection issue", {
      description: "Please check your internet connection and try again.",
      duration: 4000,
      action: {
        label: "Retry",
        onClick: () => window.location.reload(),
      },
    }),

  sessionExpired: () =>
    toast.error("Session expired", {
      description: "Your session has expired. Please sign in again.",
      duration: 4000,
    }),

  unauthorized: () =>
    toast.error("Access denied", {
      description: "You don't have permission to access this resource.",
      duration: 4000,
    }),

  profileUpdateFailed: (message?: string) =>
    toast.error("Update failed", {
      description: message || "Unable to update profile. Please try again.",
      duration: 4000,
    }),

  avatarUploadFailed: (message?: string) =>
    toast.error("Upload failed", {
      description: message || "Unable to upload avatar. Please try again.",
      duration: 4000,
    }),

  passwordChangeFailed: (message?: string) =>
    toast.error("Password change failed", {
      description: message || "Unable to change password. Please try again.",
      duration: 4000,
    }),

  invalidToken: () =>
    toast.error("Invalid link", {
      description: "This link is invalid or has expired. Please request a new one.",
      duration: 5000,
    }),

  oauthFailed: (provider: string, message?: string) =>
    toast.error(`${provider} sign in failed`, {
      description: message || `Unable to sign in with ${provider}. Please try again.`,
      duration: 4000,
    }),

  sessionRevokeFailed: () =>
    toast.error("Revocation failed", {
      description: "Unable to revoke session. Please try again.",
      duration: 4000,
    }),

  providerLinkFailed: (provider: string) =>
    toast.error("Link failed", {
      description: `Unable to link ${provider} account. Please try again.`,
      duration: 4000,
    }),

  lastProviderError: () =>
    toast.error("Cannot unlink", {
      description: "You must have at least one login method. Add another method first.",
      duration: 5000,
    }),

  mfaVerificationFailed: () =>
    toast.error("Verification failed", {
      description: "Invalid verification code. Please try again.",
      duration: 4000,
    }),

  genericError: (message?: string) =>
    toast.error("Something went wrong", {
      description: message || "An unexpected error occurred. Please try again.",
      duration: 4000,
    }),
};

/**
 * Info toast notifications
 */
export const infoToasts = {
  sessionTimeout: (minutes: number) =>
    toast.info("Session expiring soon", {
      description: `Your session will expire in ${minutes} minute${minutes !== 1 ? "s" : ""}. Click to extend.`,
      duration: 10000,
      action: {
        label: "Extend",
        onClick: () => {
          // Trigger session extension
          toast.success("Session extended", {
            description: "Your session has been extended.",
            duration: 2000,
          });
        },
      },
    }),

  emailVerificationRequired: () =>
    toast.info("Verify your email", {
      description: "Please check your inbox and verify your email address.",
      duration: 5000,
    }),

  passwordStrengthWeak: () =>
    toast.info("Weak password", {
      description: "Consider using a stronger password for better security.",
      duration: 4000,
    }),

  newDeviceLogin: (device: string) =>
    toast.info("New device sign in", {
      description: `You signed in from ${device}. If this wasn't you, secure your account immediately.`,
      duration: 6000,
    }),

  maintenanceMode: () =>
    toast.info("Maintenance scheduled", {
      description: "The service will be briefly unavailable for maintenance.",
      duration: 5000,
    }),
};

/**
 * Warning toast notifications
 */
export const warningToasts = {
  unsavedChanges: () =>
    toast.warning("Unsaved changes", {
      description: "You have unsaved changes. Save them before leaving.",
      duration: 4000,
    }),

  weakPassword: () =>
    toast.warning("Weak password detected", {
      description: "Your password doesn't meet security requirements.",
      duration: 4000,
    }),

  suspiciousActivity: () =>
    toast.warning("Unusual activity detected", {
      description: "We noticed unusual activity on your account. Review your security settings.",
      duration: 6000,
    }),

  rateLimitWarning: () =>
    toast.warning("Too many attempts", {
      description: "Please wait a moment before trying again.",
      duration: 4000,
    }),
};

/**
 * Loading toast notifications
 */
export const loadingToasts = {
  start: (message: string) =>
    toast.loading(message, {
      duration: Infinity,
    }),

  dismiss: (toastId: string | number) => toast.dismiss(toastId),
};

/**
 * Cross-tab sync notifications
 */
export const crossTabToasts = {
  loginInAnotherTab: () =>
    toast.info("Signed in", {
      description: "You signed in from another tab.",
      duration: 3000,
    }),

  logoutInAnotherTab: () =>
    toast.info("Signed out", {
      description: "You signed out from another tab.",
      duration: 3000,
    }),

  profileUpdatedInAnotherTab: () =>
    toast.info("Profile updated", {
      description: "Your profile was updated in another tab.",
      duration: 3000,
    }),
};

/**
 * Helper to show toast based on error type
 */
export function showErrorToast(error: unknown) {
  if (error instanceof Error) {
    const message = error.message;

    // Network errors
    if (message.includes("network") || message.includes("fetch")) {
      return errorToasts.networkError();
    }

    // Session errors
    if (message.includes("expired") || message.includes("session")) {
      return errorToasts.sessionExpired();
    }

    // Authorization errors
    if (message.includes("unauthorized") || message.includes("forbidden")) {
      return errorToasts.unauthorized();
    }

    // Generic error with message
    return errorToasts.genericError(message);
  }

  // Unknown error
  return errorToasts.genericError();
}

/**
 * Configure toast defaults
 */
export function configureToasts() {
  // Toasts are configured in the Toaster component
  // This function can be used for any global toast configuration
}

