# Task 18 Components - Integration Examples

This document provides practical examples of how to integrate all Task 18 components into your authentication flows.

## Table of Contents
1. [Toast Notifications](#toast-notifications)
2. [Error Handling](#error-handling)
3. [Loading States](#loading-states)
4. [Success Animations](#success-animations)
5. [Empty States](#empty-states)
6. [Confirmation Dialogs](#confirmation-dialogs)
7. [Form Validation](#form-validation)
8. [Onboarding Hints](#onboarding-hints)

---

## Toast Notifications

### Basic Usage

```typescript
import { successToasts, errorToasts, infoToasts } from "@/lib/auth/toast-notifications";

// Success toast
const handleLogin = async () => {
  try {
    await login(credentials);
    successToasts.login();
    router.push("/dashboard");
  } catch (error) {
    errorToasts.loginFailed();
  }
};

// Info toast with action
const handleSessionTimeout = () => {
  infoToasts.sessionTimeout(5); // 5 minutes warning
};

// Error toast with custom message
const handleError = (error: Error) => {
  errorToasts.genericError(error.message);
};
```

### Cross-Tab Notifications

```typescript
import { crossTabToasts } from "@/lib/auth/toast-notifications";

// In AuthContext or cross-tab sync handler
useEffect(() => {
  const handleCrossTabEvent = (event: MessageEvent) => {
    if (event.data.type === "LOGIN") {
      crossTabToasts.loginInAnotherTab();
    } else if (event.data.type === "LOGOUT") {
      crossTabToasts.logoutInAnotherTab();
    }
  };

  window.addEventListener("message", handleCrossTabEvent);
  return () => window.removeEventListener("message", handleCrossTabEvent);
}, []);
```

---

## Error Handling

### Convert Errors to User-Friendly Messages

```typescript
import { toUserFriendlyError, showErrorToast } from "@/lib/auth/user-friendly-errors";
import { AuthErrorDisplay } from "@/components/auth/error-display";

const MyComponent = () => {
  const [error, setError] = useState<AuthError | null>(null);

  const handleSubmit = async () => {
    try {
      await someAuthOperation();
    } catch (err) {
      setError(err as AuthError);
      
      // Option 1: Show toast
      showErrorToast(err);
      
      // Option 2: Display in component
      const friendlyError = toUserFriendlyError(err as AuthError);
      console.log(friendlyError.title, friendlyError.message, friendlyError.suggestion);
    }
  };

  return (
    <div>
      {error && <AuthErrorDisplay error={error} onRetry={handleSubmit} />}
      {/* Your form */}
    </div>
  );
};
```

---

## Loading States

### Form Loading

```typescript
import { FormSkeleton, ButtonSpinner } from "@/components/auth/shared";

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Simulate initial load
    setTimeout(() => setIsInitialLoad(false), 500);
  }, []);

  if (isInitialLoad) {
    return <FormSkeleton />;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <ButtonSpinner size="sm" className="mr-2" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
};
```

### Page Loading

```typescript
import { ProfileSkeleton, PageSpinner } from "@/components/auth/shared";

const ProfilePage = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return <PageSpinner />;
  }

  return <div>{/* Profile content */}</div>;
};
```

---

## Success Animations

### Form Success

```typescript
import { SuccessCheckmark, useSuccessAnimation } from "@/components/auth/shared";
import { successToasts } from "@/lib/auth/toast-notifications";

const PasswordChangeForm = () => {
  const { showSuccess, triggerSuccess } = useSuccessAnimation();

  const handleSubmit = async (data) => {
    try {
      await changePassword(data);
      triggerSuccess();
      successToasts.passwordChange();
      
      // Reset form after animation
      setTimeout(() => {
        reset();
      }, 2000);
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {showSuccess && (
        <div className="flex items-center justify-center py-4">
          <SuccessCheckmark size="lg" />
        </div>
      )}
      {/* Form fields */}
    </form>
  );
};
```

### Inline Success Indicator

```typescript
import { InlineSuccessIndicator } from "@/components/auth/shared";

const EmailInput = () => {
  const [isValid, setIsValid] = useState(false);

  return (
    <div className="relative">
      <Input
        type="email"
        value={email}
        onChange={handleChange}
      />
      {isValid && <InlineSuccessIndicator className="absolute right-3 top-1/2 -translate-y-1/2" />}
    </div>
  );
};
```

---

## Empty States

### Session List

```typescript
import { NoSessionsEmptyState } from "@/components/auth/shared";

const SessionList = () => {
  const { sessions, isLoading } = useSessions();

  if (isLoading) {
    return <SessionListSkeleton />;
  }

  if (sessions.length === 0) {
    return <NoSessionsEmptyState />;
  }

  return (
    <div>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
};
```

### Linked Providers

```typescript
import { NoLinkedProvidersEmptyState } from "@/components/auth/shared";

const LinkedProviders = () => {
  const { providers, isLoading } = useLinkedProviders();

  if (isLoading) {
    return <LoadingState />;
  }

  const linkedProviders = providers.filter((p) => p.isLinked);

  if (linkedProviders.length === 0) {
    return (
      <NoLinkedProvidersEmptyState
        onLinkProvider={() => {
          // Navigate to OAuth linking
          router.push("/profile/accounts");
        }}
      />
    );
  }

  return <div>{/* Provider list */}</div>;
};
```

---

## Confirmation Dialogs

### Session Revocation

```typescript
import { RevokeSessionDialog, useConfirmationDialog } from "@/components/auth/shared";
import { successToasts, errorToasts } from "@/lib/auth/toast-notifications";

const SessionCard = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await revokeSession(session.id);
      successToasts.sessionRevoked();
      setIsOpen(false);
    } catch (error) {
      errorToasts.sessionRevokeFailed();
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <>
      <Card>
        {/* Session info */}
        <Button onClick={() => setIsOpen(true)}>Revoke</Button>
      </Card>

      <RevokeSessionDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onConfirm={handleRevoke}
        deviceName={session.deviceName}
      />
    </>
  );
};
```

### Bulk Actions

```typescript
import { RevokeAllSessionsDialog } from "@/components/auth/shared";

const SessionManagement = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { sessions } = useSessions();
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  const handleRevokeAll = async () => {
    try {
      await revokeAllSessions();
      successToasts.allSessionsRevoked(otherSessions.length);
      setIsOpen(false);
    } catch (error) {
      errorToasts.sessionRevokeFailed();
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Revoke All Other Sessions
      </Button>

      <RevokeAllSessionsDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onConfirm={handleRevokeAll}
        sessionCount={otherSessions.length}
      />
    </>
  );
};
```

---

## Form Validation

### Real-Time Validation

```typescript
import {
  ValidationFeedback,
  InlineValidationIndicator,
  useDebouncedValidation,
} from "@/components/auth/shared";

const EmailField = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const { isValidating, isValid } = useDebouncedValidation(
    email,
    async (value) => {
      if (!value) return false;
      // Check email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setError("Invalid email format");
        return false;
      }
      // Check email availability
      const available = await checkEmailAvailability(value);
      if (!available) {
        setError("Email already in use");
        return false;
      }
      setError("");
      return true;
    },
    500
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <div className="relative">
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "email-error" : undefined}
        />
        <InlineValidationIndicator
          isValid={isValid}
          isInvalid={!!error}
          isValidating={isValidating}
        />
      </div>
      <ValidationFeedback
        isValid={isValid}
        isInvalid={!!error}
        errorMessage={error}
        successMessage="Email is available"
        helpText="Enter your email address"
      />
    </div>
  );
};
```

### Password Requirements

```typescript
import { FieldRequirements } from "@/components/auth/shared";

const PasswordField = () => {
  const [password, setPassword] = useState("");

  const requirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
  ];

  return (
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FieldRequirements requirements={requirements} />
    </div>
  );
};
```

### Character Counter

```typescript
import { CharacterCounter } from "@/components/auth/shared";

const BioField = () => {
  const [bio, setBio] = useState("");
  const maxLength = 500;

  return (
    <div className="space-y-2">
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={maxLength}
      />
      <CharacterCounter current={bio.length} max={maxLength} />
    </div>
  );
};
```

---

## Onboarding Hints

### Dismissible Hints

```typescript
import { OnboardingHint, useDismissibleHint, AuthHints } from "@/components/auth/shared";

const PasswordField = () => {
  const { shouldShow, dismiss } = useDismissibleHint("password-strength");

  return (
    <div className="space-y-4">
      {shouldShow && (
        <OnboardingHint
          title={AuthHints.PasswordStrength.title}
          description={AuthHints.PasswordStrength.description}
          onDismiss={dismiss}
        />
      )}
      {/* Password input */}
    </div>
  );
};
```

### Tooltip Hints

```typescript
import { TooltipHint } from "@/components/auth/shared";

const RememberMeCheckbox = () => {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="remember" />
      <Label htmlFor="remember" className="flex items-center space-x-1">
        <span>Remember me</span>
        <TooltipHint content="Keep you signed in on this device. Only use this on your personal devices." />
      </Label>
    </div>
  );
};
```

### Feature Introduction

```typescript
import { FeatureIntro, useDismissibleHint } from "@/components/auth/shared";

const SessionManagementPage = () => {
  const { shouldShow, dismiss } = useDismissibleHint("sessions-intro");

  return (
    <div className="space-y-6">
      {shouldShow && (
        <FeatureIntro
          title="Manage Your Active Sessions"
          description="View and control all devices where you're currently signed in."
          features={[
            "See device type, browser, and location for each session",
            "Revoke access from any device at any time",
            "Get notified of new sign-ins from unfamiliar devices",
          ]}
          onDismiss={dismiss}
        />
      )}
      {/* Session list */}
    </div>
  );
};
```

### What's This Links

```typescript
import { WhatsThisLink } from "@/components/auth/shared";

const MFASettings = () => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Label>Two-Factor Authentication</Label>
        <WhatsThisLink content="Two-factor authentication adds an extra layer of security by requiring a verification code in addition to your password." />
      </div>
      {/* MFA settings */}
    </div>
  );
};
```

---

## Complete Example: Login Form

Here's a complete example integrating multiple Task 18 components:

```typescript
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  FormSkeleton,
  ButtonSpinner,
  ValidationFeedback,
  OnboardingHint,
  TooltipHint,
  useDismissibleHint,
  AuthHints,
} from "@/components/auth/shared";
import { successToasts, errorToasts } from "@/lib/auth/toast-notifications";
import { toUserFriendlyError } from "@/lib/auth/user-friendly-errors";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { shouldShow, dismiss } = useDismissibleHint("remember-me");

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data.email, data.password, data.rememberMe);
      successToasts.login();
      router.push("/dashboard");
    } catch (err) {
      const friendlyError = toUserFriendlyError(err as AuthError);
      setError(friendlyError.message);
      errorToasts.loginFailed(friendlyError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        <ValidationFeedback
          isInvalid={!!errors.email}
          errorMessage={errors.email?.message}
          helpText="Enter your email address"
        />
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        <ValidationFeedback
          isInvalid={!!errors.password}
          errorMessage={errors.password?.message}
        />
      </div>

      {/* Remember Me */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox id="remember" {...register("rememberMe")} />
          <Label htmlFor="remember" className="flex items-center space-x-1">
            <span>Remember me</span>
            <TooltipHint content={AuthHints.RememberMe.description} />
          </Label>
        </div>
        {shouldShow && (
          <OnboardingHint
            title={AuthHints.RememberMe.title}
            description={AuthHints.RememberMe.description}
            onDismiss={dismiss}
          />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isLoading || !isValid}>
        {isLoading ? (
          <>
            <ButtonSpinner size="sm" className="mr-2" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
```

---

## Best Practices

1. **Toast Notifications**
   - Use success toasts for completed actions
   - Use error toasts for failures with retry options
   - Use info toasts for important information
   - Keep toast messages concise and actionable

2. **Error Handling**
   - Always convert technical errors to user-friendly messages
   - Provide actionable suggestions
   - Show retry buttons for recoverable errors
   - Log technical details for debugging

3. **Loading States**
   - Show skeletons for initial loads
   - Show spinners for button actions
   - Never block the entire UI unless necessary
   - Provide feedback for all async operations

4. **Success Animations**
   - Keep animations subtle and quick (< 1 second)
   - Don't block user interaction
   - Use animations to confirm actions
   - Ensure animations are accessible

5. **Empty States**
   - Always provide helpful messages
   - Offer actions when possible
   - Explain why the state is empty
   - Make empty states visually appealing

6. **Confirmation Dialogs**
   - Use for destructive actions only
   - Make consequences clear
   - Provide cancel option
   - Use appropriate button colors (red for destructive)

7. **Form Validation**
   - Validate on change with debounce
   - Show success indicators for valid fields
   - Provide helpful error messages
   - Display requirements upfront

8. **Onboarding Hints**
   - Show hints for first-time users
   - Make hints dismissible
   - Persist dismissal state
   - Don't overwhelm with too many hints

---

## Troubleshooting

### Toasts Not Showing
- Ensure Toaster is added to root layout
- Check toast position and z-index
- Verify Sonner is installed

### Animations Not Working
- Check if CSS animations are enabled
- Verify animation classes are defined in globals.css
- Test in different browsers

### Validation Not Working
- Ensure debounce delay is appropriate
- Check async validation function
- Verify error state management

### Hints Not Persisting
- Check localStorage is available
- Verify hint ID is unique
- Test in incognito mode

