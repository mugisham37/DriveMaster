# Design Document

## Overview

This document outlines the comprehensive design for implementing a complete authentication user interface system for DriveMaster. The system will provide all user-facing authentication flows while fully utilizing the existing authentication infrastructure without duplication.

### Key Design Principles

1. **Zero Duplication**: Leverage all existing hooks, contexts, API clients, and utilities
2. **Bottom-Up Construction**: Build from UI primitives to complete pages
3. **Type Safety**: Use existing TypeScript types throughout
4. **Performance First**: Implement optimistic updates, caching, and request deduplication
5. **Accessibility**: WCAG 2.1 AA compliance from the start
6. **Security**: Follow best practices for token management and CSRF protection

### Existing Infrastructure Audit

The following infrastructure already exists and MUST be utilized:

**Contexts:**
- `AuthContext`: Complete state management with reducer pattern
- Actions: LOGIN, REGISTER, LOGOUT, OAUTH, PROFILE_FETCH, SESSION_UPDATE, CROSS_TAB_SYNC
- Granular loading states: isLoginLoading, isRegisterLoading, isOAuthLoading, etc.
- Specific error states: loginError, registerError, oauthError, profileError

**Hooks:**
- `useAuth()`: Access authentication state
- `useAuthActions()`: Login, register, logout, OAuth operations
- `useAuthGuards()`: useRequireAuth, useRequireMentor, useRequireInsider
- `useAuthStatus()`: Check auth status without redirects
- `useRouteProtection()`: Comprehensive route protection logic

**API Clients:**
- `authServiceClient`: Core authentication (login, register, logout, refresh)
- `oauthClient`: OAuth flows (initiate, callback, link, unlink)
- `profileSessionClient`: Profile and session management

**Utilities:**
- `integratedTokenManager`: Token storage, refresh, cross-tab sync
- `crossTabSync`: BroadcastChannel-based synchronization
- `tokenRefreshManager`: Automatic token refresh with retry logic
- `circuitBreaker`: Resilience pattern for API failures
- `authResilience`: Graceful degradation and error recovery

**Types:**
- All authentication types defined in `types/auth-service.ts`
- Error types with discriminated unions
- Complete API endpoint type maps


## Architecture

### Component Hierarchy

```
Authentication System
├── UI Primitives (shadcn/ui - already exist)
│   ├── Button
│   ├── Input
│   ├── Label
│   ├── Card
│   ├── Alert
│   ├── Skeleton
│   └── Toast (Sonner)
│
├── Authentication Molecules (to build)
│   ├── LoginForm
│   ├── RegisterForm
│   ├── OAuthButtons
│   ├── PasswordStrengthIndicator
│   ├── AuthErrorDisplay
│   └── LoadingState
│
├── Authentication Organisms (to build)
│   ├── SignInPage
│   ├── SignUpPage
│   ├── ForgotPasswordPage
│   ├── ResetPasswordPage
│   ├── OAuthCallbackHandler
│   ├── ProfilePage
│   ├── SessionManagementPage
│   └── PasswordChangePage
│
├── Route Guards (to build)
│   ├── ProtectedRoute
│   ├── PublicRoute
│   ├── MentorRoute
│   └── InsiderRoute
│
└── Page Routes (to build)
    ├── /auth/signin
    ├── /auth/signup
    ├── /auth/forgot-password
    ├── /auth/reset-password
    ├── /auth/oauth/[provider]/callback
    ├── /profile
    ├── /profile/sessions
    └── /profile/security
```

### Data Flow

```
User Action
    ↓
Component (Form/Button)
    ↓
useAuthActions Hook
    ↓
AuthContext Dispatch (Action)
    ↓
AuthContext Reducer (State Update)
    ↓
API Client (authClient/oauthClient)
    ↓
Token Manager (Store/Refresh)
    ↓
Cross-Tab Sync (Broadcast)
    ↓
Component Re-render (Updated State)
```

### State Management Pattern

All authentication state lives in `AuthContext`. Components NEVER create local state for:
- User data
- Authentication status
- Loading states
- Error states

Components MAY use local state for:
- Form field values (via React Hook Form)
- UI-only state (modals, dropdowns)
- Temporary input before submission


## Components and Interfaces

### 1. Authentication Forms

#### LoginForm Component

**Purpose**: Email/password login with validation and "Remember Me"

**Props:**
```typescript
interface LoginFormProps {
  onSuccess?: (user: UserProfile) => void;
  redirectTo?: string;
  showOAuthOptions?: boolean;
}
```

**Hooks Used:**
- `useAuthActions()` for login action
- `useAuth()` for loading/error states
- `useForm()` from react-hook-form for validation

**State Management:**
- Form values: React Hook Form
- Loading: `isLoginLoading` from AuthContext
- Errors: `loginError` from AuthContext

**Validation:**
- Email format validation
- Password minimum length (6 characters)
- Real-time field validation with debounce

**Features:**
- Password visibility toggle
- "Remember Me" checkbox
- Autocomplete attributes for password managers
- Loading spinner on submit button
- Field-specific error messages
- Form-level error display

#### RegisterForm Component

**Purpose**: User registration with email, password, country, timezone

**Props:**
```typescript
interface RegisterFormProps {
  onSuccess?: (user: UserProfile) => void;
  redirectTo?: string;
  showOAuthOptions?: boolean;
}
```

**Hooks Used:**
- `useAuthActions()` for register action
- `useAuth()` for loading/error states
- `useForm()` from react-hook-form

**State Management:**
- Form values: React Hook Form
- Loading: `isRegisterLoading` from AuthContext
- Errors: `registerError` from AuthContext

**Validation:**
- Email format and uniqueness (debounced API check)
- Password strength (8+ chars, uppercase, lowercase, number)
- Country selection required
- Timezone auto-detected from browser

**Features:**
- Password strength indicator (real-time)
- Password visibility toggle
- Country dropdown with search
- Timezone auto-detection
- Email uniqueness check (debounced)
- Terms of service checkbox
- Loading spinner on submit button


#### OAuthButtons Component

**Purpose**: Social login buttons for all OAuth providers

**Props:**
```typescript
interface OAuthButtonsProps {
  mode: 'login' | 'register' | 'link';
  onSuccess?: (user: UserProfile) => void;
  redirectUrl?: string;
  excludeProviders?: OAuthProviderType[];
}
```

**Hooks Used:**
- `useAuthActions()` for initiateOAuth
- `useAuth()` for oauthError and isOAuthLoading

**Features:**
- Button for each enabled provider (Google, Apple, Facebook, GitHub, Microsoft)
- Provider-specific loading states
- Brand colors and icons
- Disabled state when one provider is loading
- Error display for OAuth failures
- CSRF state parameter generation

**Provider Configuration:**
```typescript
const providers = [
  { id: 'google', name: 'Google', icon: GoogleIcon, color: '#4285F4' },
  { id: 'apple', name: 'Apple', icon: AppleIcon, color: '#000000' },
  { id: 'facebook', name: 'Facebook', icon: FacebookIcon, color: '#1877F2' },
  { id: 'github', name: 'GitHub', icon: GitHubIcon, color: '#181717' },
  { id: 'microsoft', name: 'Microsoft', icon: MicrosoftIcon, color: '#00A4EF' }
];
```

#### PasswordStrengthIndicator Component

**Purpose**: Visual feedback for password strength

**Props:**
```typescript
interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}
```

**Strength Calculation:**
- Length >= 8 characters
- Contains uppercase letter
- Contains lowercase letter
- Contains number
- Contains special character (optional)

**Visual Display:**
- Progress bar with color coding (red/yellow/green)
- Text label (Weak/Fair/Good/Strong)
- Requirement checklist (optional)


### 2. Page Components

#### SignInPage

**Route:** `/auth/signin`

**Features:**
- LoginForm component
- OAuthButtons component
- "Forgot password?" link
- "Don't have an account?" link to signup
- Callback URL handling from query params
- Auto-redirect if already authenticated

**Layout:**
```
┌─────────────────────────────────┐
│         DriveMaster Logo        │
│                                 │
│      Sign in to continue        │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Email Input              │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │  Password Input    [👁]   │ │
│  └───────────────────────────┘ │
│  ☐ Remember me                  │
│                                 │
│  ┌───────────────────────────┐ │
│  │      Sign In Button       │ │
│  └───────────────────────────┘ │
│                                 │
│      Forgot password?           │
│                                 │
│  ─────── or sign in with ────── │
│                                 │
│  [Google] [Apple] [GitHub]      │
│                                 │
│  Don't have an account? Sign up │
└─────────────────────────────────┘
```

#### SignUpPage

**Route:** `/auth/signup`

**Features:**
- RegisterForm component
- OAuthButtons component
- "Already have an account?" link to signin
- Terms of service agreement
- Auto-redirect if already authenticated

**Layout:**
```
┌─────────────────────────────────┐
│         DriveMaster Logo        │
│                                 │
│      Create your account        │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Email Input              │ │
│  └───────────────────────────┘ │
│  ┌───────────────────────────┐ │
│  │  Password Input    [👁]   │ │
│  └───────────────────────────┘ │
│  [Password Strength Indicator]  │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Country Dropdown         │ │
│  └───────────────────────────┘ │
│                                 │
│  ☐ I agree to Terms of Service  │
│                                 │
│  ┌───────────────────────────┐ │
│  │      Sign Up Button       │ │
│  └───────────────────────────┘ │
│                                 │
│  ─────── or sign up with ────── │
│                                 │
│  [Google] [Apple] [GitHub]      │
│                                 │
│  Already have an account? Sign in│
└─────────────────────────────────┘
```


#### ProfilePage

**Route:** `/profile`

**Features:**
- Display user profile information
- Editable fields with inline validation
- Avatar upload with preview
- Linked OAuth providers management
- Save/Discard changes buttons
- Optimistic updates with rollback

**Sections:**
1. **Profile Header**
   - Avatar with upload button
   - User handle and name
   - Reputation and flair
   - Badges and roles (Mentor, Insider)

2. **Personal Information**
   - Name (editable)
   - Email (read-only, verified badge)
   - Bio (editable textarea)
   - Location (editable)
   - Website (editable with validation)

3. **Social Links**
   - GitHub username (editable)
   - Twitter username (editable)

4. **Linked Accounts**
   - List of linked OAuth providers
   - Link/Unlink buttons
   - Last used timestamp

5. **Preferences**
   - Theme selection (light/dark/system)
   - Email notifications toggle
   - Mentor notifications toggle
   - Language preference
   - Timezone

**Hooks Used:**
- `useAuth()` for user data
- `useAuthActions()` for updateProfile
- `useForm()` for form management

**State Management:**
- Form values: React Hook Form with defaultValues from user
- Dirty state: Track changes to enable/disable save button
- Loading: `isProfileLoading` from AuthContext
- Errors: `profileError` from AuthContext


#### SessionManagementPage

**Route:** `/profile/sessions`

**Features:**
- List all active sessions
- Device type, browser, OS detection
- Location from IP address
- Last active timestamp
- "This device" indicator for current session
- Revoke individual sessions
- Revoke all other sessions
- Auto-refresh every 30 seconds

**Session Card Layout:**
```
┌─────────────────────────────────────┐
│ [Device Icon] Chrome on Windows     │
│                                     │
│ Location: New York, USA             │
│ IP: 192.168.1.1                     │
│ Last active: 2 minutes ago          │
│                                     │
│ [This device] or [Revoke Session]   │
└─────────────────────────────────────┘
```

**Hooks Used:**
- Custom `useSessions()` hook wrapping profileSessionClient
- `useInterval()` for auto-refresh

**Data Structure:**
```typescript
interface SessionDisplay extends Session {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserName: string;
  osName: string;
  locationDisplay: string;
  relativeTime: string;
}
```

**Features:**
- Virtual scrolling for users with many sessions
- Confirmation dialog before revoking
- Bulk revoke with warning message
- Loading states during revocation
- Success toast after revocation


#### OAuthCallbackHandler

**Route:** `/auth/oauth/[provider]/callback`

**Purpose**: Handle OAuth callback and exchange code for tokens

**Flow:**
1. Extract `code` and `state` from URL query params
2. Validate state parameter (CSRF protection)
3. Call `handleOAuthCallback()` from useAuthActions
4. Handle success: redirect to intended destination
5. Handle error: display error and offer retry

**Features:**
- Loading spinner during token exchange
- Error display with user-friendly messages
- Automatic redirect on success
- Fallback to signin page on error
- State validation for security

**Error Handling:**
- User denied access: "Authorization cancelled"
- Invalid state: "Security check failed"
- Expired code: "Login timed out"
- Provider error: "Couldn't connect to [Provider]"

### 3. Route Guards

#### ProtectedRoute Component

**Purpose**: Wrapper for routes requiring authentication

**Implementation:**
```typescript
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isRedirecting, shouldRender } = useRequireAuth();
  
  if (isRedirecting) {
    return <LoadingSkeleton />;
  }
  
  if (!shouldRender) {
    return null;
  }
  
  return <>{children}</>;
}
```

**Features:**
- Automatic redirect to signin with callback URL
- Loading skeleton during auth check
- Prevents flash of protected content

#### MentorRoute Component

**Purpose**: Wrapper for mentor-only routes

**Implementation:**
```typescript
export function MentorRoute({ children }: { children: React.ReactNode }) {
  const { isRedirecting, isMentorRedirecting, shouldRender } = useRequireMentor();
  
  if (isRedirecting || isMentorRedirecting) {
    return <LoadingSkeleton />;
  }
  
  if (!shouldRender) {
    return null;
  }
  
  return <>{children}</>;
}
```


## Data Models

All data models are defined in `types/auth-service.ts` and MUST be used as-is:

### Core Types

**UserProfile**: Complete user information
- id, handle, name, email, avatarUrl
- reputation, flair, badges
- isMentor, isInsider, seniority, userRole
- preferences (theme, notifications, language, timezone)
- tracks (joined tracks with progress)

**TokenPair**: Authentication tokens
- accessToken, refreshToken, expiresIn, tokenType

**LoginCredentials**: Login form data
- email, password

**RegisterData**: Registration form data
- email, password, countryCode, timezone, language

**Session**: Active session information
- id, userId, deviceInfo, ipAddress, userAgent
- location, createdAt, lastActiveAt, expiresAt
- isCurrent, isActive

### Error Types

All error types use discriminated unions for type safety:

**AuthError**: Base error type
- type: 'network' | 'validation' | 'authentication' | 'authorization' | 'server' | 'oauth'
- message, code, details, recoverable, retryAfter, field

**ValidationError**: Field validation errors
- type: 'validation'
- field: specific field name
- constraints: array of validation messages

**NetworkError**: Connection issues
- type: 'network'
- statusCode, retryAfter

**AuthenticationError**: Login/token errors
- type: 'authentication'
- code: 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | etc.

**OAuthError**: OAuth-specific errors
- type: 'oauth'
- code: 'OAUTH_DENIED' | 'STATE_MISMATCH' | etc.
- provider: OAuthProviderType


## Error Handling

### Error Classification and Recovery

The system uses existing error classification from `AuthErrorHandler`:

#### Network Errors
**Display**: "Connection issue. Please check your internet and try again."
**Action**: Prominent "Retry" button
**Technical**: Circuit breaker prevents repeated failures
**Fallback**: Show cached data with "offline mode" indicator

#### Validation Errors
**Display**: Field-specific messages below inputs
**Action**: Highlight invalid fields with red border
**Technical**: Map backend field errors to form fields
**Recovery**: User corrects and resubmits

#### Authentication Errors
**Display**: "Invalid email or password" or "Session expired"
**Action**: Clear password field, keep email, allow retry
**Technical**: If token refresh fails, trigger logout
**Recovery**: User enters correct credentials

#### Authorization Errors
**Display**: "You don't have permission to access this page"
**Action**: Redirect to appropriate page
**Technical**: Role guards prevent access
**Recovery**: User upgrades account or contacts support

#### Server Errors
**Display**: "Service temporarily unavailable"
**Action**: Automatic retry after 5s, then manual retry
**Technical**: Circuit breaker opens after 3 failures
**Fallback**: Graceful degradation with cached data

#### OAuth Errors
**Display**: Provider-specific user-friendly messages
**Action**: Retry or switch to email login
**Technical**: State validation, code exchange
**Recovery**: User retries OAuth or uses alternative method

### Error Display Components

#### AuthErrorDisplay Component

**Purpose**: Consistent error message display

**Props:**
```typescript
interface AuthErrorDisplayProps {
  error: AuthError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetryButton?: boolean;
}
```

**Features:**
- Icon based on error type
- User-friendly message
- Retry button for recoverable errors
- Dismiss button
- Auto-dismiss after timeout (optional)
- Accessibility announcements


## Testing Strategy

### Unit Testing

**Form Components:**
- Validation logic (email format, password strength)
- Field-level error display
- Form submission with valid/invalid data
- Loading states during submission
- Success callbacks

**OAuth Components:**
- Provider button rendering
- Loading states per provider
- Error handling for OAuth failures
- State parameter generation

**Error Display:**
- Error message formatting
- Retry button functionality
- Dismiss behavior
- Accessibility attributes

### Integration Testing

**Authentication Flows:**
- Complete login flow (form → API → redirect)
- Complete registration flow
- OAuth flow (initiate → callback → redirect)
- Logout flow with cross-tab sync
- Token refresh flow

**Profile Management:**
- Fetch and display profile
- Update profile with optimistic updates
- Avatar upload
- Link/unlink OAuth providers

**Session Management:**
- Fetch sessions list
- Revoke individual session
- Revoke all other sessions
- Auto-refresh sessions

### End-to-End Testing

**User Journeys:**
- New user registration → email verification → dashboard
- Existing user login → dashboard
- OAuth login → dashboard
- Forgot password → reset → login
- Profile update → save → verify changes
- Session management → revoke → verify logout

**Cross-Tab Scenarios:**
- Login in tab A → verify tab B updates
- Logout in tab A → verify tab B logs out
- Token refresh in tab A → verify tab B syncs

**Error Scenarios:**
- Network failure → retry → success
- Invalid credentials → error display → retry
- Session expiration → auto-logout → redirect
- OAuth denial → error display → alternative method

### Accessibility Testing

**Keyboard Navigation:**
- Tab through all form fields
- Submit forms with Enter key
- Navigate modals with Escape key
- Focus management in dialogs

**Screen Reader:**
- Form labels announced correctly
- Error messages announced
- Loading states announced
- Success messages announced

**Visual:**
- Color contrast ratios (4.5:1 minimum)
- Focus indicators visible
- Text resizable to 200%
- No information conveyed by color alone


## Performance Optimization

### Request Optimization

**Deduplication**: Use existing `optimizedAuthOps` from `performance-optimization.ts`
- Login requests deduplicated by email
- Profile fetches deduplicated by user ID
- OAuth initiations deduplicated by provider

**Caching**: Leverage existing intelligent cache
- Profile data cached for 5 minutes
- Sessions list cached for 30 seconds
- OAuth providers list cached for 1 hour

**Prefetching**: Implement strategic prefetching
- Prefetch user profile after successful login
- Prefetch sessions list when navigating to sessions page
- Prefetch OAuth providers on signin/signup page load

### Rendering Optimization

**Code Splitting**: Split authentication pages
```typescript
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
```

**Skeleton Loaders**: Show content structure while loading
- Profile page skeleton matches actual layout
- Session list skeleton shows card structure
- Form skeleton for slow network conditions

**Optimistic Updates**: Immediate UI feedback
- Profile updates show immediately, rollback on error
- Session revocation removes card immediately
- OAuth linking shows linked state immediately

**Virtual Scrolling**: For large lists
- Sessions list with 100+ items
- Use react-window for efficient rendering

### Bundle Optimization

**Tree Shaking**: Import only what's needed
```typescript
// Good
import { Button } from '@/components/ui/button';

// Bad
import * as UI from '@/components/ui';
```

**Dynamic Imports**: Load OAuth providers on demand
```typescript
const GoogleIcon = lazy(() => import('./icons/GoogleIcon'));
```

**Image Optimization**: Use Next.js Image component
- Avatar images optimized and cached
- Provider icons served as SVG
- Lazy load images below fold


## Security Considerations

### Token Management

**Storage**: Use existing `integratedTokenManager`
- Access tokens in memory only (never localStorage)
- Refresh tokens in httpOnly cookies (backend managed)
- Automatic refresh 5 minutes before expiration
- Token rotation on every refresh

**Transmission**: Secure communication
- All API calls over HTTPS only
- Tokens in Authorization header
- No sensitive data in URL parameters

### CSRF Protection

**OAuth Flows**: Use existing `OAuthStateManager`
- State parameter generated and validated
- PKCE flow for enhanced security
- Code verifier stored in sessionStorage
- State cleared after use

**Form Submissions**: CSRF tokens for sensitive operations
- Password change requires CSRF token
- Session revocation requires CSRF token
- Profile updates require CSRF token

### Input Validation

**Client-Side**: Prevent common attacks
- Sanitize all user inputs
- Validate email format
- Enforce password complexity
- Limit input lengths

**Server-Side**: Always validate on backend
- Never trust client validation
- Backend enforces all rules
- Rate limiting on sensitive endpoints

### Session Security

**Timeout**: Automatic logout after inactivity
- 30 minutes default timeout
- Warning at 25 minutes
- Option to extend session
- Configurable per user preference

**Concurrent Sessions**: Manage multiple devices
- Track all active sessions
- Allow session revocation
- Notify on new device login
- Option to revoke all other sessions


## Accessibility Implementation

### WCAG 2.1 AA Compliance

**Perceivable:**
- All form inputs have associated labels
- Error messages have sufficient color contrast (4.5:1)
- Icons have text alternatives
- Loading states announced to screen readers

**Operable:**
- All functionality available via keyboard
- Focus indicators clearly visible
- No keyboard traps in modals
- Skip links for navigation

**Understandable:**
- Clear, consistent labels
- Error messages are descriptive
- Instructions provided where needed
- Predictable navigation

**Robust:**
- Valid HTML structure
- ARIA attributes used correctly
- Compatible with assistive technologies
- Semantic HTML elements

### ARIA Implementation

**Form Fields:**
```typescript
<Input
  id="email"
  type="email"
  aria-label="Email address"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && (
  <span id="email-error" role="alert" aria-live="polite">
    {errors.email.message}
  </span>
)}
```

**Loading States:**
```typescript
<Button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Spinner aria-hidden="true" />
      <span className="sr-only">Signing in...</span>
    </>
  ) : (
    'Sign In'
  )}
</Button>
```

**Modals:**
```typescript
<Dialog
  open={isOpen}
  onOpenChange={setIsOpen}
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <DialogTitle id="dialog-title">Confirm Action</DialogTitle>
  <DialogDescription id="dialog-description">
    Are you sure you want to revoke this session?
  </DialogDescription>
</Dialog>
```

### Keyboard Navigation

**Tab Order**: Logical flow through form
1. Email input
2. Password input
3. Remember me checkbox
4. Sign in button
5. Forgot password link
6. OAuth buttons
7. Sign up link

**Shortcuts**: Common keyboard patterns
- Enter: Submit form
- Escape: Close modal/dismiss error
- Tab: Next field
- Shift+Tab: Previous field


## Responsive Design

### Breakpoints

Using Tailwind CSS breakpoints:
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)

### Mobile-First Approach

**Authentication Forms:**
- Full-width on mobile (< 640px)
- Max-width 400px on desktop
- Centered with padding
- Stack OAuth buttons vertically on mobile

**Profile Page:**
- Single column on mobile
- Two columns on tablet (md)
- Three columns on desktop (lg)
- Responsive avatar size

**Session List:**
- Stack cards on mobile
- Two columns on tablet
- Three columns on desktop
- Responsive card padding

### Touch Targets

**Minimum Size**: 44x44px for touch targets
- Buttons: 44px height minimum
- Checkboxes: 24px with 44px touch area
- Links: Adequate padding for touch

**Spacing**: Sufficient space between interactive elements
- 8px minimum between buttons
- 16px between form fields
- 24px between sections

### Typography

**Responsive Font Sizes:**
```css
/* Headings */
h1: text-2xl md:text-3xl lg:text-4xl
h2: text-xl md:text-2xl lg:text-3xl
h3: text-lg md:text-xl lg:text-2xl

/* Body */
body: text-sm md:text-base
small: text-xs md:text-sm

/* Form Labels */
label: text-sm md:text-base
```

**Line Height**: Adequate for readability
- Headings: 1.2
- Body text: 1.5
- Form labels: 1.4


## Implementation Dependencies

### Required Packages (Already Installed)

**UI Components:**
- `@radix-ui/*`: Accessible UI primitives
- `tailwindcss`: Utility-first CSS
- `class-variance-authority`: Component variants
- `tailwind-merge`: Merge Tailwind classes
- `lucide-react`: Icon library

**Forms:**
- `react-hook-form`: Form state management
- `zod`: Schema validation
- `@hookform/resolvers`: Zod integration

**Notifications:**
- `sonner`: Toast notifications

**Utilities:**
- `date-fns`: Date formatting
- `clsx`: Conditional classes

### File Structure

```
apps/web-app/src/
├── app/
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   └── oauth/
│   │       └── [provider]/
│   │           └── callback/
│   │               └── page.tsx
│   ├── profile/
│   │   ├── page.tsx
│   │   ├── sessions/
│   │   │   └── page.tsx
│   │   └── security/
│   │       └── page.tsx
│   └── layout.tsx (wrap with AuthProvider)
│
├── components/
│   ├── auth/
│   │   ├── forms/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   ├── ResetPasswordForm.tsx
│   │   │   └── PasswordChangeForm.tsx
│   │   ├── oauth/
│   │   │   ├── OAuthButtons.tsx
│   │   │   ├── OAuthCallbackHandler.tsx
│   │   │   └── LinkedProviders.tsx
│   │   ├── profile/
│   │   │   ├── ProfileForm.tsx
│   │   │   ├── AvatarUpload.tsx
│   │   │   └── PreferencesForm.tsx
│   │   ├── sessions/
│   │   │   ├── SessionList.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   └── SessionActions.tsx
│   │   ├── guards/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── MentorRoute.tsx
│   │   │   └── InsiderRoute.tsx
│   │   ├── shared/
│   │   │   ├── AuthErrorDisplay.tsx
│   │   │   ├── PasswordStrengthIndicator.tsx
│   │   │   └── LoadingState.tsx
│   │   └── error-boundary.tsx (already exists)
│   └── ui/ (already exists with shadcn components)
│
├── lib/auth/ (already exists - DO NOT MODIFY)
├── hooks/ (already exists - DO NOT MODIFY)
├── contexts/ (already exists - DO NOT MODIFY)
└── types/ (already exists - DO NOT MODIFY)
```

### Integration Points

**AuthContext Integration:**
- All components use `useAuth()` for state
- All actions use `useAuthActions()` for operations
- No direct API client calls from components

**Route Protection:**
- Wrap protected pages with `ProtectedRoute`
- Wrap mentor pages with `MentorRoute`
- Wrap insider pages with `InsiderRoute`

**Error Handling:**
- Use `AuthErrorDisplay` for all error messages
- Map error types to user-friendly messages
- Provide retry actions for recoverable errors

**Loading States:**
- Use skeleton loaders for async data
- Use inline spinners for button actions
- Use loading overlays for full-page operations


## Design Decisions and Rationale

### 1. Form Management with React Hook Form

**Decision**: Use React Hook Form for all forms

**Rationale**:
- Minimal re-renders (better performance)
- Built-in validation with Zod
- Easy integration with existing UI components
- Excellent TypeScript support
- Handles complex validation scenarios

### 2. Error Handling Strategy

**Decision**: Use discriminated unions for error types

**Rationale**:
- Type-safe error handling
- Compiler ensures all error types handled
- Easy to add new error types
- Clear error classification
- Existing infrastructure already implements this

### 3. State Management

**Decision**: Single AuthContext for all auth state

**Rationale**:
- Single source of truth
- Prevents state synchronization issues
- Existing infrastructure already implements this
- Easy to debug and test
- Supports cross-tab synchronization

### 4. OAuth Implementation

**Decision**: Use existing OAuthClient with state management

**Rationale**:
- CSRF protection built-in
- PKCE flow for enhanced security
- State validation prevents attacks
- Existing infrastructure handles complexity
- Supports all major providers

### 5. Token Management

**Decision**: Use existing IntegratedTokenManager

**Rationale**:
- Automatic token refresh
- Cross-tab synchronization
- Secure storage (memory only)
- Handles edge cases (network failures, concurrent refreshes)
- Battle-tested implementation

### 6. Component Architecture

**Decision**: Atomic design with molecules and organisms

**Rationale**:
- Reusable components
- Easy to test in isolation
- Clear component hierarchy
- Maintainable codebase
- Follows existing patterns

### 7. Accessibility First

**Decision**: Build accessibility in from the start

**Rationale**:
- Easier than retrofitting
- Better user experience for everyone
- Legal compliance (WCAG 2.1 AA)
- Improves SEO
- Demonstrates quality

### 8. Performance Optimization

**Decision**: Implement optimistic updates and caching

**Rationale**:
- Better perceived performance
- Reduces server load
- Improves user experience
- Existing infrastructure supports it
- Easy to implement with rollback


## Migration and Rollout Strategy

### Phase 1: Foundation (Week 1)

**Goal**: Build core authentication forms and pages

**Deliverables**:
- LoginForm component
- RegisterForm component
- OAuthButtons component
- SignInPage
- SignUpPage
- AuthErrorDisplay component
- PasswordStrengthIndicator component

**Testing**: Unit tests for forms and validation

### Phase 2: OAuth Integration (Week 2)

**Goal**: Complete OAuth flows

**Deliverables**:
- OAuthCallbackHandler component
- OAuth callback routes for all providers
- LinkedProviders component
- OAuth error handling

**Testing**: Integration tests for OAuth flows

### Phase 3: Profile Management (Week 3)

**Goal**: User profile and preferences

**Deliverables**:
- ProfilePage
- ProfileForm component
- AvatarUpload component
- PreferencesForm component
- Profile update with optimistic updates

**Testing**: Integration tests for profile operations

### Phase 4: Session Management (Week 4)

**Goal**: Session viewing and revocation

**Deliverables**:
- SessionManagementPage
- SessionList component
- SessionCard component
- Session revocation functionality
- Auto-refresh implementation

**Testing**: Integration tests for session management

### Phase 5: Security Features (Week 5)

**Goal**: Password management and security

**Deliverables**:
- ForgotPasswordPage
- ResetPasswordPage
- PasswordChangeForm component
- Password reset flow
- Email verification handling

**Testing**: End-to-end tests for security flows

### Phase 6: Route Protection (Week 6)

**Goal**: Protected routes and guards

**Deliverables**:
- ProtectedRoute component
- MentorRoute component
- InsiderRoute component
- Route protection integration
- Redirect handling

**Testing**: Integration tests for route protection

### Phase 7: Polish and Optimization (Week 7)

**Goal**: Performance and UX improvements

**Deliverables**:
- Loading skeletons everywhere
- Optimistic updates refined
- Error messages improved
- Accessibility audit and fixes
- Performance profiling and optimization

**Testing**: Accessibility testing, performance testing

### Phase 8: Testing and Documentation (Week 8)

**Goal**: Comprehensive testing and documentation

**Deliverables**:
- Complete test coverage
- End-to-end test suite
- User documentation
- Developer documentation
- Migration guide

**Testing**: Full regression testing


## Success Metrics

### Functional Metrics

**Authentication Success Rate**: > 99%
- Successful logins / Total login attempts
- Track by method (email, OAuth)

**OAuth Conversion Rate**: > 80%
- Completed OAuth flows / Initiated OAuth flows
- Track by provider

**Profile Update Success Rate**: > 95%
- Successful updates / Total update attempts

**Session Management Usage**: Track adoption
- Users viewing sessions
- Sessions revoked
- Security-conscious behavior

### Performance Metrics

**Page Load Time**: < 1 second
- Time to interactive for auth pages
- Measured at 75th percentile

**Form Submission Time**: < 500ms
- Time from submit to response
- Includes network latency

**Token Refresh Time**: < 200ms
- Background refresh should be imperceptible
- No UI blocking

**Profile Load Time**: < 300ms
- With caching enabled
- Measured at 75th percentile

### User Experience Metrics

**Error Recovery Rate**: > 90%
- Users who retry after error
- Successful recovery attempts

**Accessibility Compliance**: 100%
- WCAG 2.1 AA compliance
- No critical accessibility issues

**Mobile Usability**: > 95%
- Touch target compliance
- Responsive design quality

**Cross-Browser Compatibility**: 100%
- Chrome, Firefox, Safari, Edge
- No critical browser-specific issues

### Security Metrics

**Token Security**: 100%
- No tokens in localStorage
- All tokens in memory or httpOnly cookies

**CSRF Protection**: 100%
- All OAuth flows use state parameter
- All sensitive operations use CSRF tokens

**Session Security**: Track metrics
- Average session duration
- Sessions per user
- Revocation frequency


## Appendix

### A. Validation Rules

**Email Validation:**
```typescript
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters');
```

**Password Validation (Login):**
```typescript
const loginPasswordSchema = z.string()
  .min(6, 'Password must be at least 6 characters');
```

**Password Validation (Registration):**
```typescript
const registerPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
```

**Country Code Validation:**
```typescript
const countryCodeSchema = z.string()
  .length(2, 'Country code must be 2 characters')
  .regex(/^[A-Z]{2}$/, 'Invalid country code format');
```

### B. API Endpoint Reference

All endpoints are defined in `types/auth-service.ts` under `AuthServiceEndpoints`.

**Authentication:**
- POST `/auth/login` - Email/password login
- POST `/auth/register` - User registration
- POST `/auth/refresh` - Token refresh
- POST `/auth/logout` - Logout

**Profile:**
- GET `/auth/profile` - Get user profile
- PATCH `/auth/profile` - Update profile

**OAuth:**
- GET `/auth/oauth/:provider/initiate` - Start OAuth flow
- POST `/auth/oauth/:provider/callback` - Handle OAuth callback
- POST `/auth/oauth/:provider/link` - Link provider to account
- DELETE `/auth/oauth/:provider/unlink` - Unlink provider
- GET `/auth/oauth/providers` - Get available providers
- GET `/auth/oauth/linked` - Get linked providers

**Sessions:**
- GET `/auth/sessions` - List active sessions
- DELETE `/auth/sessions/:sessionId` - Revoke session

**Health:**
- GET `/auth/health` - Service health check

### C. Environment Variables

Required environment variables (already configured):

```env
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=true
NEXT_PUBLIC_OAUTH_APPLE_ENABLED=true
NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED=true
NEXT_PUBLIC_OAUTH_GITHUB_ENABLED=true
NEXT_PUBLIC_OAUTH_MICROSOFT_ENABLED=true
```

### D. Browser Support

**Minimum Supported Versions:**
- Chrome: 90+
- Firefox: 88+
- Safari: 14+
- Edge: 90+

**Required Features:**
- ES2020 support
- BroadcastChannel API (with localStorage fallback)
- Crypto API for PKCE
- Fetch API
- LocalStorage/SessionStorage

