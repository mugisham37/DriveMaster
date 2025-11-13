/**
 * Empty State Components
 * Provides helpful and actionable empty states for authentication flows
 */

"use client";

import React from "react";
import {
  Monitor,
  Link2,
  Bell,
  Shield,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  } | undefined;
  className?: string;
}

/**
 * Generic empty state component
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps): React.ReactElement {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon && (
          <div className="mb-4 rounded-full bg-gray-100 p-4">{icon}</div>
        )}
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 max-w-sm text-sm text-gray-600">{description}</p>
        {action && (
          <Button onClick={action.onClick} variant="default">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for no active sessions
 */
export function NoSessionsEmptyState({
  className = "",
}: {
  className?: string;
}): React.ReactElement {
  return (
    <EmptyState
      icon={<Monitor className="h-8 w-8 text-gray-400" />}
      title="No Active Sessions"
      description="You don't have any other active sessions. Your current session is the only one accessing your account."
      className={className}
    />
  );
}

/**
 * Empty state for no linked OAuth providers
 */
export function NoLinkedProvidersEmptyState({
  onLinkProvider,
  className = "",
}: {
  onLinkProvider?: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <EmptyState
      icon={<Link2 className="h-8 w-8 text-gray-400" />}
      title="No Linked Accounts"
      description="Link your social media accounts to sign in faster and keep your account more secure with multiple login options."
      action={
        onLinkProvider
          ? {
              label: "Link an Account",
              onClick: onLinkProvider,
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Empty state for no notifications
 */
export function NoNotificationsEmptyState({
  className = "",
}: {
  className?: string;
}): React.ReactElement {
  return (
    <EmptyState
      icon={<Bell className="h-8 w-8 text-gray-400" />}
      title="No Notifications"
      description="You're all caught up! We'll notify you here when there's something new."
      className={className}
    />
  );
}

/**
 * Empty state for no security events
 */
export function NoSecurityEventsEmptyState({
  className = "",
}: {
  className?: string;
}): React.ReactElement {
  return (
    <EmptyState
      icon={<Shield className="h-8 w-8 text-gray-400" />}
      title="No Security Events"
      description="Your account is secure. We'll alert you here if we detect any unusual activity."
      className={className}
    />
  );
}

/**
 * Empty state for first-time users
 */
export function WelcomeEmptyState({
  userName,
  onGetStarted,
  className = "",
}: {
  userName?: string;
  onGetStarted?: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <EmptyState
      icon={<UserPlus className="h-8 w-8 text-primary" />}
      title={userName ? `Welcome, ${userName}!` : "Welcome!"}
      description="Let's get you started. Complete your profile and explore the platform to make the most of your account."
      action={
        onGetStarted
          ? {
              label: "Get Started",
              onClick: onGetStarted,
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Empty state for error scenarios
 */
export function ErrorEmptyState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
  className = "",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <EmptyState
      icon={<AlertCircle className="h-8 w-8 text-red-500" />}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  );
}
