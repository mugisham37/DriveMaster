'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { type LucideIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';

export type NotificationAction =
  | 'markRead'
  | 'markUnread'
  | 'delete'
  | 'snooze'
  | 'open'
  | 'archive';

export interface NotificationActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  action: NotificationAction;
  icon?: LucideIcon;
  loading?: boolean;
  onAction: () => void | Promise<void>;
  requireConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
}

const actionLabels: Record<NotificationAction, string> = {
  markRead: 'Mark as read',
  markUnread: 'Mark as unread',
  delete: 'Delete',
  snooze: 'Snooze',
  open: 'Open',
  archive: 'Archive',
};

const destructiveActions: NotificationAction[] = ['delete', 'archive'];

export function NotificationActionButton({
  action,
  icon: Icon,
  loading: externalLoading,
  onAction,
  requireConfirmation,
  confirmationTitle,
  confirmationDescription,
  variant,
  size = 'sm',
  className,
  disabled,
  ...props
}: NotificationActionButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const loading = externalLoading || internalLoading;
  const isDestructive = destructiveActions.includes(action);
  const shouldConfirm = requireConfirmation ?? isDestructive;

  const handleClick = async () => {
    if (shouldConfirm) {
      setShowConfirmation(true);
      return;
    }

    await executeAction();
  };

  const executeAction = async () => {
    try {
      setInternalLoading(true);
      await onAction();
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
    } finally {
      setInternalLoading(false);
      setShowConfirmation(false);
    }
  };

  const buttonVariant = variant || (isDestructive ? 'destructive' : 'ghost');
  const ariaLabel = actionLabels[action];

  return (
    <>
      <Button
        variant={buttonVariant}
        size={size}
        onClick={handleClick}
        disabled={disabled || loading}
        className={cn('transition-all duration-200', className)}
        aria-label={ariaLabel}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : Icon ? (
          <Icon className="h-4 w-4" />
        ) : null}
        {props.children || <span className="sr-only">{ariaLabel}</span>}
      </Button>

      {shouldConfirm && (
        <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmationTitle || `Confirm ${action}`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmationDescription ||
                  `Are you sure you want to ${action} this notification? This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={executeAction} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
