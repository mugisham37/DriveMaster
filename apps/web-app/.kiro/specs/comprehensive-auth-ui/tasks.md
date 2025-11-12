# Implementation Plan

## Overview

This implementation plan breaks down the comprehensive authentication UI system into discrete, actionable coding tasks. Each task builds incrementally on previous tasks and references specific requirements from the requirements document.

## Task Structure

- Tasks are numbered with decimal notation (1.1, 1.2, etc.)
- Each task includes specific implementation details
- Sub-tasks marked with `*` are optional (testing, documentation)
- All tasks reference requirements they fulfill
- Tasks assume existing infrastructure is available and should be used

---

## 1. Foundation Setup and Shared Components

- [x] 1.1 Create authentication component directory structure
  - Create `components/auth/forms/` directory
  - Create `components/auth/oauth/` directory
  - Create `components/auth/profile/` directory
  - Create `components/auth/sessions/` directory
  - Create `components/auth/guards/` directory
  - Create `components/auth/shared/` directory
  - _Requirements: All_

- [x] 1.2 Create AuthErrorDisplay component
  - Build component to display AuthError with type-specific styling
  - Implement error icon based on error type (network, validation, auth, etc.)
  - Add retry button for recoverable errors
  - Add dismiss functionality
  - Implement ARIA live region for screen reader announcements
  - Support auto-dismiss with configurable timeout
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 15.2_
  - **Note: Component already existed at src/components/auth/error-display.tsx**

- [x] 1.3 Create PasswordStrengthIndicator component
  - Implement password strength calculation logic
  - Create visual progress bar with color coding (red/yellow/green)
  - Add text label (Weak/Fair/Good/Strong)
  - Create optional requirements checklist
  - Ensure accessibility with ARIA attributes
  - _Requirements: 1.3, 8.2, 15.1_

- [x] 1.4 Create LoadingState component
  - Build skeleton loader for forms
  - Build skeleton loader for profile page
  - Build skeleton loader for session list
  - Create inline spinner for button actions
  - Ensure loading states are announced to screen readers
  - _Requirements: 14.1, 14.2, 15.2_

---

## 2. Authentication Forms

- [ ] 2.1 Create LoginForm component
  - Set up React Hook Form with Zod validation schema
  - Create email input field with validation
  - Create password input field with visibility toggle
  - Add "Remember Me" checkbox
  - Implement form submission using `useAuthActions().login`
  - Display loading state using `isLoginLoading` from `useAuth()`
  - Display errors using `loginError` from `useAuth()`
  - Add autocomplete attributes for password managers
  - Implement field-level error display
  - Add ARIA attributes for accessibility
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 14.1, 15.1, 15.2_

  - [ ]* 2.1.1 Write unit tests for LoginForm validation
    - Test email format validation
    - Test password minimum length
    - Test form submission with valid data
    - Test error display
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2.2 Create RegisterForm component
  - Set up React Hook Form with Zod validation schema
  - Create email input with format validation
  - Create password input with strength validation
  - Integrate PasswordStrengthIndicator component
  - Create country dropdown with search functionality
  - Auto-detect timezone from browser
  - Auto-detect language from browser
  - Add terms of service checkbox
  - Implement form submission using `useAuthActions().register`
  - Display loading state using `isRegisterLoading`
  - Display errors using `registerError`
  - Implement debounced email uniqueness check
  - Add ARIA attributes for accessibility
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 14.1, 15.1, 15.2_

  - [ ]* 2.2.1 Write unit tests for RegisterForm validation
    - Test password strength validation
    - Test country selection
    - Test timezone auto-detection
    - Test email uniqueness check
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2.3 Create ForgotPasswordForm component
  - Set up React Hook Form with email validation
  - Create email input field
  - Implement form submission to request password reset
  - Display success message after submission
  - Display errors using AuthErrorDisplay
  - Add loading state during submission
  - _Requirements: 9.1, 14.1, 15.1_

- [ ] 2.4 Create ResetPasswordForm component
  - Set up React Hook Form with password validation
  - Create new password input with strength indicator
  - Create confirm password input with match validation
  - Extract and validate reset token from URL
  - Implement form submission to reset password
  - Display success message and redirect to login
  - Handle expired/invalid token errors
  - _Requirements: 9.2, 9.3, 9.4, 9.5, 14.1, 15.1_

- [ ] 2.5 Create PasswordChangeForm component
  - Set up React Hook Form with validation
  - Create current password input
  - Create new password input with strength indicator
  - Create confirm new password input
  - Implement form submission using profile API
  - Display success message after change
  - Handle incorrect current password error
  - Revoke all other sessions after successful change
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 14.1, 15.1_

---

## 3. OAuth Integration

- [x] 3.1 Create OAuthButtons component
  - Create button for each OAuth provider (Google, Apple, Facebook, GitHub, Microsoft)
  - Use provider-specific brand colors and icons
  - Implement click handler using `useAuthActions().initiateOAuth`
  - Display provider-specific loading states
  - Disable all buttons when one is loading
  - Display OAuth errors using AuthErrorDisplay
  - Support different modes (login, register, link)
  - Filter providers based on `excludeProviders` prop
  - Add ARIA labels for accessibility
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 14.1, 15.1_

  - [ ]* 3.1.1 Write unit tests for OAuthButtons
    - Test button rendering for each provider
    - Test loading states
    - Test error display
    - Test mode switching (login/register/link)
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 Create OAuthCallbackHandler component
  - Extract `code` and `state` from URL query parameters
  - Extract `provider` from URL path parameter
  - Validate state parameter using existing OAuthStateManager
  - Call `useAuthActions().handleOAuthCallback` with code and state
  - Display loading spinner during token exchange
  - Handle success: redirect to intended destination or dashboard
  - Handle errors: display user-friendly error messages
  - Provide retry option for recoverable errors
  - Provide fallback to signin page for non-recoverable errors
  - _Requirements: 3.3, 3.4, 3.5, 13.1, 13.2, 14.1_

  - [ ]* 3.2.1 Write integration tests for OAuth callback
    - Test successful OAuth callback flow
    - Test state validation
    - Test error handling for invalid code
    - Test error handling for expired state
    - _Requirements: 3.3, 3.4, 3.5_

- [x] 3.3 Create LinkedProviders component
  - Fetch linked providers using `useAuthActions().getLinkedProviders`
  - Display list of all OAuth providers with linked status
  - Show "Linked" badge for connected providers
  - Show "Link" button for unlinked providers
  - Show "Unlink" button for linked providers
  - Implement link action using `useAuthActions().linkOAuthProvider`
  - Implement unlink action using `useAuthActions().unlinkOAuthProvider`
  - Prevent unlinking last authentication method
  - Display confirmation dialog before unlinking
  - Show last used timestamp for linked providers
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 14.1, 15.1_

  - [ ]* 3.3.1 Write integration tests for LinkedProviders
    - Test fetching linked providers
    - Test linking new provider
    - Test unlinking provider
    - Test prevention of unlinking last method
    - _Requirements: 18.1, 18.2, 18.3, 18.4_


---

## 4. Authentication Pages

- [x] 4.1 Create SignInPage component
  - Create page layout with centered card
  - Integrate LoginForm component
  - Integrate OAuthButtons component (mode: 'login')
  - Add "Forgot password?" link to forgot password page
  - Add "Don't have an account?" link to signup page
  - Extract and handle `callbackUrl` from query parameters
  - Implement auto-redirect if user is already authenticated
  - Add page title and meta tags for SEO
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 10.2, 15.1_

- [x] 4.2 Create SignUpPage component
  - Create page layout with centered card
  - Integrate RegisterForm component
  - Integrate OAuthButtons component (mode: 'register')
  - Add "Already have an account?" link to signin page
  - Add terms of service link
  - Extract and handle `callbackUrl` from query parameters
  - Implement auto-redirect if user is already authenticated
  - Add page title and meta tags for SEO
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 15.1_

- [x] 4.3 Create ForgotPasswordPage component
  - Create page layout with centered card
  - Integrate ForgotPasswordForm component
  - Add "Back to sign in" link
  - Display success message after email sent
  - Add page title and meta tags
  - _Requirements: 9.1, 15.1_

- [x] 4.4 Create ResetPasswordPage component
  - Create page layout with centered card
  - Integrate ResetPasswordForm component
  - Extract reset token from URL query parameters
  - Display token validation errors
  - Redirect to login after successful reset
  - Add page title and meta tags
  - _Requirements: 9.2, 9.3, 9.4, 9.5, 15.1_

- [x] 4.5 Create OAuth callback route pages
  - Create dynamic route at `/auth/oauth/[provider]/callback/page.tsx`
  - Integrate OAuthCallbackHandler component
  - Handle all OAuth providers (google, apple, facebook, github, microsoft)
  - Add loading state during callback processing
  - Add error boundary for OAuth errors
  - _Requirements: 3.3, 3.4, 3.5, 13.1, 14.1_

---

## 5. Profile Management

- [x] 5.1 Create ProfileForm component
  - Set up React Hook Form with user profile as default values
  - Create editable fields: name, bio, location, website
  - Create social link fields: GitHub username, Twitter username
  - Implement field validation (URL format for website, etc.)
  - Track form dirty state to enable/disable save button
  - Implement form submission using `useAuthActions().updateProfile`
  - Implement optimistic updates with rollback on error
  - Display success toast after successful save
  - Add "Discard changes" button with confirmation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 14.1, 14.5, 15.1_

  - [ ]* 5.1.1 Write integration tests for ProfileForm
    - Test profile data loading
    - Test field validation
    - Test optimistic updates
    - Test rollback on error
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 5.2 Create AvatarUpload component
  - Create file input with drag-and-drop support
  - Implement image preview with crop functionality
  - Validate file size (max 5MB)
  - Validate file type (image/jpeg, image/png, image/webp)
  - Display upload progress indicator
  - Implement upload using profile API
  - Update profile display immediately on success
  - Handle upload errors with retry option
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 14.1, 15.1_

  - [ ]* 5.2.1 Write integration tests for AvatarUpload
    - Test file validation
    - Test upload progress
    - Test successful upload
    - Test error handling
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5.3 Create PreferencesForm component
  - Create theme selection (light/dark/system)
  - Create email notifications toggle
  - Create mentor notifications toggle
  - Create language preference dropdown
  - Create timezone selection
  - Implement form submission using `useAuthActions().updateProfile`
  - Display success message after save
  - Apply theme change immediately
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 14.1, 15.1_

- [x] 5.4 Create ProfilePage component
  - Create page layout with sections
  - Display profile header with avatar, handle, name
  - Display reputation, flair, and badges
  - Display roles (Mentor, Insider, User)
  - Integrate ProfileForm component
  - Integrate AvatarUpload component
  - Integrate PreferencesForm component
  - Integrate LinkedProviders component
  - Fetch profile data using `useAuth().fetchProfile`
  - Display skeleton loader while fetching
  - Handle profile fetch errors
  - Add page title and meta tags
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 14.2, 15.1, 18.1_


---

## 6. Session Management

- [x] 6.1 Create SessionCard component
  - Display device type icon (desktop, mobile, tablet)
  - Display browser name and OS
  - Display location (city, country) from IP
  - Display last active timestamp (relative time)
  - Display "This device" indicator for current session
  - Create "Revoke" button for non-current sessions
  - Implement revoke action with confirmation dialog
  - Display loading state during revocation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 14.1, 15.1_

- [x] 6.2 Create SessionList component
  - Fetch sessions using profileSessionClient.getSessions()
  - Parse user agent to extract device, browser, OS information
  - Sort sessions by last active (most recent first)
  - Render SessionCard for each session
  - Implement virtual scrolling for large lists (react-window)
  - Add "Revoke all other sessions" button
  - Implement bulk revoke with confirmation dialog
  - Display empty state when no sessions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.1, 15.1, 20.5_

  - [ ]* 6.2.1 Write integration tests for SessionList
    - Test session fetching
    - Test session display
    - Test individual revocation
    - Test bulk revocation
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6.3 Create SessionManagementPage component
  - Create page layout with header
  - Integrate SessionList component
  - Implement auto-refresh every 30 seconds using useInterval
  - Display last updated timestamp
  - Add manual refresh button
  - Display skeleton loader during initial fetch
  - Handle session fetch errors
  - Add page title and meta tags
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.2, 15.1_

- [x] 6.4 Create PasswordChangePage component
  - Create page layout with security section
  - Integrate PasswordChangeForm component
  - Display password requirements
  - Display last password change date
  - Add link to forgot password flow
  - Add page title and meta tags
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 15.1_

---

## 7. Route Protection

- [x] 7.1 Create ProtectedRoute component
  - Use `useRequireAuth()` hook for authentication check
  - Display LoadingState skeleton during auth check
  - Prevent flash of protected content
  - Return null if redirecting
  - Render children if authenticated
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 14.2_

  - [ ]* 7.1.1 Write integration tests for ProtectedRoute
    - Test redirect when not authenticated
    - Test rendering when authenticated
    - Test callback URL preservation
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 7.2 Create MentorRoute component
  - Use `useRequireMentor()` hook for role check
  - Display LoadingState skeleton during checks
  - Redirect to dashboard if not mentor
  - Display "Access denied" message
  - Render children if user is mentor
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 14.2_

  - [ ]* 7.2.1 Write integration tests for MentorRoute
    - Test redirect when not mentor
    - Test rendering when mentor
    - Test error message display
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 7.3 Create InsiderRoute component
  - Use `useRequireInsider()` hook for role check
  - Display LoadingState skeleton during checks
  - Redirect to insiders page if not insider
  - Display "Access denied" message
  - Render children if user is insider
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 14.2_

  - [ ]* 7.3.1 Write integration tests for InsiderRoute
    - Test redirect when not insider
    - Test rendering when insider
    - Test error message display
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 7.4 Create PublicRoute component (optional)
  - Redirect to dashboard if already authenticated
  - Useful for signin/signup pages
  - Render children if not authenticated
  - _Requirements: 10.1, 10.2_


---

## 8. Page Routes Integration

- [x] 8.1 Create signin page route
  - Create file at `app/auth/signin/page.tsx`
  - Integrate SignInPage component
  - Add metadata for SEO
  - Wrap with PublicRoute (optional)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2_

- [x] 8.2 Create signup page route
  - Create file at `app/auth/signup/page.tsx`
  - Integrate SignUpPage component
  - Add metadata for SEO
  - Wrap with PublicRoute (optional)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2_

- [x] 8.3 Create forgot password page route
  - Create file at `app/auth/forgot-password/page.tsx`
  - Integrate ForgotPasswordPage component
  - Add metadata for SEO
  - _Requirements: 9.1_

- [x] 8.4 Create reset password page route
  - Create file at `app/auth/reset-password/page.tsx`
  - Integrate ResetPasswordPage component
  - Add metadata for SEO
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [ ] 8.5 Create OAuth callback routes
  - Create file at `app/auth/oauth/[provider]/callback/page.tsx`
  - Integrate OAuthCallbackHandler component
  - Handle dynamic provider parameter
  - Add error boundary
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 8.6 Create profile page route
  - Create file at `app/profile/page.tsx`
  - Integrate ProfilePage component
  - Wrap with ProtectedRoute
  - Add metadata for SEO
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 10.1_

- [x] 8.7 Create sessions page route
  - Create file at `app/profile/sessions/page.tsx`
  - Integrate SessionManagementPage component
  - Wrap with ProtectedRoute
  - Add metadata for SEO
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1_

- [x] 8.8 Create security page route
  - Create file at `app/profile/security/page.tsx`
  - Integrate PasswordChangePage component
  - Wrap with ProtectedRoute
  - Add metadata for SEO
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.1_

---

## 9. Email Verification

- [x] 9.1 Create EmailVerificationBanner component
  - Display banner when email is not verified
  - Show "Verify your email" message
  - Add "Resend verification email" button
  - Implement resend functionality
  - Display success message after resend
  - Add dismiss button (stores in preferences)
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 14.1_

- [x] 9.2 Create EmailVerificationPage component
  - Extract verification token from URL
  - Validate token with API
  - Display success message on verification
  - Display error message for invalid/expired token
  - Provide "Resend" option for expired tokens
  - Redirect to dashboard after successful verification
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 9.3 Create email verification route
  - Create file at `app/auth/verify-email/page.tsx`
  - Integrate EmailVerificationPage component
  - Add metadata for SEO
  - _Requirements: 17.1, 17.2, 17.3_

- [x] 9.4 Integrate EmailVerificationBanner in layout
  - Add EmailVerificationBanner to main layout
  - Show only when user is authenticated and email not verified
  - Position at top of page
  - _Requirements: 17.4_

---

## 10. Multi-Factor Authentication (Optional)

- [x] 10.1 Create MFASetupModal component
  - Display QR code for authenticator app
  - Show setup instructions
  - Create verification code input
  - Implement setup verification
  - Display backup codes after setup
  - Add "Download backup codes" button
  - _Requirements: 19.1, 19.2, 15.1_

- [x] 10.2 Create MFAVerificationForm component
  - Create 6-digit code input
  - Implement code verification
  - Display error for invalid code
  - Add "Use backup code" option
  - Add "Lost access?" link
  - _Requirements: 19.3, 19.4, 15.1_

- [x] 10.3 Create MFASettingsSection component
  - Display MFA status (enabled/disabled)
  - Add "Enable MFA" button when disabled
  - Add "Disable MFA" button when enabled
  - Show last used timestamp
  - Display backup codes count
  - Add "Regenerate backup codes" button
  - _Requirements: 19.1, 19.2, 19.5, 15.1_

- [x] 10.4 Integrate MFA into login flow
  - Check mfaEnabled flag after password verification
  - Show MFAVerificationForm if MFA enabled
  - Verify MFA code before completing login
  - Handle MFA errors appropriately
  - _Requirements: 19.3, 19.4_

- [x] 10.5 Integrate MFA settings into security page
  - Add MFASettingsSection to PasswordChangePage
  - Show only if backend supports MFA (check user.mfaEnabled flag)
  - _Requirements: 19.1, 19.2, 19.5_

---

## 11. Cross-Tab Synchronization

- [x] 11.1 Test cross-tab login synchronization
  - Verify login in tab A updates tab B
  - Verify user data syncs across tabs
  - Verify token refresh syncs across tabs
  - Test with existing crossTabSync implementation
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - **Implementation**: Created test page at `/test/cross-tab-sync` with comprehensive testing UI

- [x] 11.2 Test cross-tab logout synchronization
  - Verify logout in tab A logs out tab B
  - Verify all tabs redirect to signin
  - Verify tokens cleared in all tabs
  - Test with existing crossTabSync implementation
  - _Requirements: 12.2, 12.3, 12.4_
  - **Implementation**: Integrated into test page with logout testing functionality

- [x] 11.3 Test cross-tab profile update synchronization
  - Verify profile update in tab A refreshes tab B
  - Test with existing crossTabSync implementation
  - _Requirements: 12.3, 12.4_
  - **Implementation**: Integrated into test page with profile update testing

- [x] 11.4 Add visual indicator for cross-tab events
  - Show toast notification when another tab logs in
  - Show toast notification when another tab logs out
  - Show toast notification when profile updated in another tab
  - _Requirements: 12.1, 12.2, 12.3_
  - **Implementation**: Created `useCrossTabNotifications` hook integrated into AuthProvider

---

## 12. Error Recovery and Resilience

- [x] 12.1 Implement retry logic for network errors
  - Use existing circuit breaker from authResilience
  - Display retry button for network errors
  - Implement exponential backoff for retries
  - Show retry count to user
  - _Requirements: 13.1, 13.5_
  - **Implementation**: Created `RetryButton` component with exponential backoff visualization and `useRetry` hook

- [x] 12.2 Implement graceful degradation for service unavailability
  - Use existing graceful degradation from authResilience
  - Show cached profile data when API unavailable
  - Display "offline mode" indicator
  - Allow limited functionality without API
  - _Requirements: 13.1, 13.4, 13.5_
  - **Implementation**: Created `OfflineModeIndicator` component with 3 variants (banner/badge/toast) and `useOfflineMode` hook

- [x] 12.3 Implement session timeout warning
  - Show warning modal 5 minutes before timeout
  - Add "Extend session" button
  - Implement countdown timer
  - Auto-logout when timeout reached
  - _Requirements: 16.5_
  - **Implementation**: Created `SessionTimeoutWarning` component with activity tracking, countdown timer, and `useSessionTimeout` hook

- [x] 12.4 Add error boundary for authentication pages
  - Create AuthErrorBoundary component
  - Catch and display unhandled errors
  - Provide "Try again" action
  - Log errors for debugging
  - _Requirements: 13.1, 13.5_
  - **Implementation**: Created `AuthErrorBoundary` component with recovery suggestions, technical details, and `withAuthErrorBoundary` HOC

---

## 13. Performance Optimization

- [ ] 13.1 Implement code splitting for auth pages
  - Use dynamic imports for SignInPage
  - Use dynamic imports for SignUpPage
  - Use dynamic imports for ProfilePage
  - Use dynamic imports for SessionManagementPage
  - Measure bundle size reduction
  - _Requirements: 20.4_

- [ ] 13.2 Implement request deduplication
  - Verify existing optimizedAuthOps is used
  - Test concurrent login requests are deduplicated
  - Test concurrent profile fetches are deduplicated
  - Measure performance improvement
  - _Requirements: 20.2_

- [ ] 13.3 Implement intelligent caching
  - Verify existing intelligent cache is used
  - Test profile data cached for 5 minutes
  - Test sessions list cached for 30 seconds
  - Measure cache hit rate
  - _Requirements: 20.1, 20.2_

- [ ] 13.4 Implement optimistic updates
  - Verify profile updates show immediately
  - Verify rollback on error works correctly
  - Test session revocation removes card immediately
  - Measure perceived performance improvement
  - _Requirements: 14.5, 20.1_

- [ ] 13.5 Implement virtual scrolling for session list
  - Use react-window for SessionList
  - Test with 100+ sessions
  - Measure rendering performance
  - _Requirements: 20.5_

- [ ] 13.6 Optimize image loading
  - Use Next.js Image component for avatars
  - Implement lazy loading for images below fold
  - Optimize provider icons (use SVG)
  - Measure image load time improvement
  - _Requirements: 20.1_

---

## 14. Accessibility Enhancements

- [ ] 14.1 Add ARIA labels to all interactive elements
  - Add aria-label to all buttons
  - Add aria-describedby to form fields with errors
  - Add aria-invalid to invalid form fields
  - Add aria-required to required fields
  - Add aria-busy to loading buttons
  - _Requirements: 15.1, 15.2_

- [ ] 14.2 Implement focus management
  - Trap focus in modals
  - Restore focus after modal close
  - Auto-focus first input in forms
  - Manage focus in route transitions
  - _Requirements: 15.4_

- [ ] 14.3 Add screen reader announcements
  - Announce form errors with aria-live
  - Announce loading states
  - Announce success messages
  - Announce navigation changes
  - _Requirements: 15.2_

- [ ] 14.4 Ensure keyboard navigation
  - Test tab order in all forms
  - Test Enter key submits forms
  - Test Escape key closes modals
  - Test arrow keys in dropdowns
  - _Requirements: 15.3_

- [ ] 14.5 Verify color contrast
  - Check all text meets 4.5:1 ratio
  - Check error messages meet contrast requirements
  - Check disabled states are distinguishable
  - Use automated tools (axe, Lighthouse)
  - _Requirements: 15.5_

  - [ ]* 14.5.1 Run accessibility audit
    - Use axe DevTools
    - Use Lighthouse accessibility score
    - Test with screen reader (NVDA/JAWS)
    - Test keyboard-only navigation
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

---

## 15. Responsive Design Implementation

- [ ] 15.1 Implement mobile-first form layouts
  - Make auth forms full-width on mobile
  - Center forms with max-width on desktop
  - Stack OAuth buttons vertically on mobile
  - Test on various screen sizes
  - _Requirements: All form-related requirements_

- [ ] 15.2 Implement responsive profile page
  - Single column layout on mobile
  - Two column layout on tablet
  - Three column layout on desktop
  - Responsive avatar size
  - Test on various screen sizes
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 15.3 Implement responsive session list
  - Stack session cards on mobile
  - Two columns on tablet
  - Three columns on desktop
  - Responsive card padding
  - Test on various screen sizes
  - _Requirements: 7.1, 7.2_

- [ ] 15.4 Ensure touch targets meet minimum size
  - Verify all buttons are 44x44px minimum
  - Verify checkboxes have 44px touch area
  - Verify links have adequate padding
  - Test on touch devices
  - _Requirements: 15.1, 15.3_

- [ ] 15.5 Test responsive typography
  - Verify font sizes scale appropriately
  - Verify line heights are readable
  - Test text wrapping on small screens
  - Test readability on large screens
  - _Requirements: All requirements_

---

## 16. Security Hardening

- [ ] 16.1 Verify token storage security
  - Confirm access tokens only in memory
  - Confirm no tokens in localStorage
  - Confirm refresh tokens in httpOnly cookies
  - Test token clearing on logout
  - _Requirements: 16.1, 16.2_

- [ ] 16.2 Verify CSRF protection
  - Confirm OAuth state parameter used
  - Confirm PKCE flow implemented
  - Confirm state validation works
  - Test CSRF attack scenarios
  - _Requirements: 16.2, 16.3_

- [ ] 16.3 Implement input sanitization
  - Sanitize all user inputs
  - Prevent XSS attacks
  - Validate input lengths
  - Test with malicious inputs
  - _Requirements: 16.3, 16.4_

- [ ] 16.4 Verify HTTPS-only communication
  - Confirm all API calls use HTTPS
  - Confirm no sensitive data in URLs
  - Test in production environment
  - _Requirements: 16.4_

- [ ] 16.5 Implement session timeout
  - Add 30-minute inactivity timeout
  - Show warning at 25 minutes
  - Provide "Extend session" option
  - Auto-logout on timeout
  - _Requirements: 16.5_

  - [ ]* 16.5.1 Perform security audit
    - Test token storage
    - Test CSRF protection
    - Test input sanitization
    - Test session timeout
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_


---

## 17. Integration Testing

- [ ] 17.1 Test complete login flow
  - Test email/password login
  - Test "Remember Me" functionality
  - Test redirect to callback URL
  - Test error handling
  - Test cross-tab sync
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.1_

  - [ ]* 17.1.1 Write end-to-end test for login flow
    - Navigate to signin page
    - Fill in credentials
    - Submit form
    - Verify redirect to dashboard
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 17.2 Test complete registration flow
  - Test user registration
  - Test email verification prompt
  - Test redirect to dashboard
  - Test error handling
  - Test cross-tab sync
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 12.1_

  - [ ]* 17.2.1 Write end-to-end test for registration flow
    - Navigate to signup page
    - Fill in registration form
    - Submit form
    - Verify redirect to dashboard
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 17.3 Test complete OAuth flow
  - Test OAuth initiation for each provider
  - Test OAuth callback handling
  - Test state validation
  - Test error handling
  - Test redirect to dashboard
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 17.3.1 Write end-to-end test for OAuth flow
    - Navigate to signin page
    - Click OAuth provider button
    - Mock OAuth callback
    - Verify redirect to dashboard
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 17.4 Test complete profile update flow
  - Test profile data fetch
  - Test profile field updates
  - Test optimistic updates
  - Test error handling and rollback
  - Test success notification
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 17.4.1 Write end-to-end test for profile update
    - Navigate to profile page
    - Update profile fields
    - Submit form
    - Verify optimistic update
    - Verify success message
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 17.5 Test complete session management flow
  - Test session list fetch
  - Test session revocation
  - Test bulk revocation
  - Test auto-refresh
  - Test error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 17.5.1 Write end-to-end test for session management
    - Navigate to sessions page
    - Verify session list display
    - Revoke a session
    - Verify session removed
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 17.6 Test complete password reset flow
  - Test forgot password request
  - Test reset email sent
  - Test reset token validation
  - Test password reset
  - Test redirect to login
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 17.6.1 Write end-to-end test for password reset
    - Navigate to forgot password page
    - Submit email
    - Navigate to reset page with token
    - Submit new password
    - Verify redirect to login
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 17.7 Test route protection
  - Test protected route redirects when not authenticated
  - Test mentor route redirects when not mentor
  - Test insider route redirects when not insider
  - Test callback URL preservation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 17.7.1 Write end-to-end test for route protection
    - Navigate to protected route while logged out
    - Verify redirect to signin
    - Verify callback URL in query params
    - Login
    - Verify redirect to original route
    - _Requirements: 10.1, 10.2, 10.3_

---

## 18. Polish and User Experience

- [ ] 18.1 Add loading skeletons everywhere
  - Add skeleton for profile page
  - Add skeleton for session list
  - Add skeleton for forms (slow network)
  - Add skeleton for OAuth buttons
  - Test with throttled network
  - _Requirements: 14.2_

- [ ] 18.2 Improve error messages
  - Make all error messages user-friendly
  - Add actionable suggestions
  - Remove technical jargon
  - Test with various error scenarios
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 18.3 Add success animations
  - Add checkmark animation for successful login
  - Add success animation for profile save
  - Add success animation for password change
  - Use subtle, non-intrusive animations
  - _Requirements: 14.3_

- [ ] 18.4 Implement toast notifications
  - Use Sonner for all toast notifications
  - Add success toasts for all operations
  - Add error toasts for failures
  - Add info toasts for warnings
  - Configure toast position and duration
  - _Requirements: 14.3_

- [ ] 18.5 Add empty states
  - Add empty state for no sessions
  - Add empty state for no linked providers
  - Add empty state for no notifications
  - Make empty states helpful and actionable
  - _Requirements: All requirements_

- [ ] 18.6 Add confirmation dialogs
  - Add confirmation for session revocation
  - Add confirmation for bulk session revocation
  - Add confirmation for OAuth unlinking
  - Add confirmation for account deletion (if applicable)
  - Use consistent dialog styling
  - _Requirements: 7.3, 7.4, 18.3_

- [ ] 18.7 Improve form validation feedback
  - Add real-time validation with debounce
  - Show validation success indicators
  - Improve error message positioning
  - Add field-level help text
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 14.1_

- [ ] 18.8 Add onboarding hints
  - Add tooltips for first-time users
  - Add help text for complex features
  - Add "What's this?" links where needed
  - Make hints dismissible
  - _Requirements: All requirements_

---

## 19. Documentation

- [ ]* 19.1 Write component documentation

  - Document all authentication components
  - Add JSDoc comments to props
  - Add usage examples
  - Document integration patterns
  - _Requirements: All_

- [ ]* 19.2 Write integration guide

  - Document how to use authentication hooks
  - Document route protection patterns
  - Document error handling patterns
  - Add code examples
  - _Requirements: All_

- [ ]* 19.3 Write testing guide

  - Document testing patterns
  - Add test examples
  - Document mocking strategies
  - Add E2E test examples
  - _Requirements: All_

- [ ]* 19.4 Write accessibility guide

  - Document accessibility patterns used
  - Add ARIA attribute reference
  - Document keyboard navigation
  - Add screen reader testing guide
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 19.5 Create user documentation

  - Write user guide for authentication
  - Document OAuth provider setup
  - Document session management
  - Document security features
  - _Requirements: All_

---

## 20. Final Testing and Validation

- [ ]* 20.1 Perform comprehensive functional testing

  - Test all authentication flows
  - Test all error scenarios
  - Test all edge cases
  - Verify all requirements met
  - _Requirements: All_

- [ ]* 20.2 Perform cross-browser testing

  - Test on Chrome
  - Test on Firefox
  - Test on Safari
  - Test on Edge
  - _Requirements: All_

- [ ]* 20.3 Perform cross-device testing

  - Test on desktop
  - Test on tablet
  - Test on mobile
  - Test on different screen sizes
  - _Requirements: All_

- [ ]* 20.4 Perform performance testing

  - Measure page load times
  - Measure form submission times
  - Measure token refresh times
  - Verify performance metrics met
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ]* 20.5 Perform security testing

  - Test token storage
  - Test CSRF protection
  - Test input sanitization
  - Test session security
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]* 20.6 Perform accessibility testing

  - Run automated accessibility tests
  - Test with screen readers
  - Test keyboard navigation
  - Verify WCAG 2.1 AA compliance
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

---

## Summary

This implementation plan provides a comprehensive, step-by-step guide to building the complete authentication UI system. Each task is:

- **Actionable**: Clear implementation steps
- **Incremental**: Builds on previous tasks
- **Traceable**: References specific requirements
- **Testable**: Includes testing sub-tasks
- **Complete**: Covers all 20 requirements

The plan prioritizes core functionality first (authentication, OAuth, profile) before moving to advanced features (MFA, session management, security). Optional testing tasks are marked with `*` to allow flexibility in implementation approach.

**Total Tasks**: 20 major sections with 100+ individual tasks
**Estimated Timeline**: 8-10 weeks for complete implementation
**Testing Coverage**: Unit, integration, E2E, accessibility, security, performance
