/**
 * Confirmation Dialog Components
 * Provides consistent confirmation dialogs for destructive actions
 */

"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, LogOut, Trash2, Unlink } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
}

/**
 * Generic confirmation dialog
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  icon,
}: ConfirmationDialogProps): React.ReactElement {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {icon && <div className="mb-2">{icon}</div>}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
                : ""
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Confirmation dialog for session revocation
 */
export function RevokeSessionDialog({
  open,
  onOpenChange,
  onConfirm,
  deviceName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  deviceName?: string;
}): React.ReactElement {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Revoke Session?"
      description={
        deviceName
          ? `Are you sure you want to revoke the session on ${deviceName}? This will log out that device immediately.`
          : "Are you sure you want to revoke this session? This will log out that device immediately."
      }
      confirmLabel="Revoke Session"
      cancelLabel="Cancel"
      variant="destructive"
      icon={<LogOut className="h-6 w-6 text-red-600" />}
    />
  );
}

/**
 * Confirmation dialog for bulk session revocation
 */
export function RevokeAllSessionsDialog({
  open,
  onOpenChange,
  onConfirm,
  sessionCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  sessionCount: number;
}): React.ReactElement {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Revoke All Other Sessions?"
      description={`Are you sure you want to revoke all ${sessionCount} other session${sessionCount !== 1 ? "s" : ""}? This will log out all other devices immediately. Your current session will remain active.`}
      confirmLabel="Revoke All Sessions"
      cancelLabel="Cancel"
      variant="destructive"
      icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
    />
  );
}

/**
 * Confirmation dialog for OAuth provider unlinking
 */
export function UnlinkProviderDialog({
  open,
  onOpenChange,
  onConfirm,
  providerName,
  isLastProvider = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  providerName: string;
  isLastProvider?: boolean;
}): React.ReactElement {
  if (isLastProvider) {
    return (
      <ConfirmationDialog
        open={open}
        onOpenChange={onOpenChange}
        onConfirm={() => {
          // Don't allow unlinking last provider
          onOpenChange(false);
        }}
        title="Cannot Unlink Provider"
        description={`${providerName} is your only login method. Please add another login method before unlinking this provider.`}
        confirmLabel="OK"
        cancelLabel=""
        variant="default"
        icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
      />
    );
  }

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={`Unlink ${providerName}?`}
      description={`Are you sure you want to unlink your ${providerName} account? You won't be able to sign in with ${providerName} anymore.`}
      confirmLabel="Unlink Account"
      cancelLabel="Cancel"
      variant="destructive"
      icon={<Unlink className="h-6 w-6 text-red-600" />}
    />
  );
}

/**
 * Confirmation dialog for account deletion
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}): React.ReactElement {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete Account?"
      description="Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted."
      confirmLabel="Delete Account"
      cancelLabel="Cancel"
      variant="destructive"
      icon={<Trash2 className="h-6 w-6 text-red-600" />}
    />
  );
}

/**
 * Hook for managing confirmation dialogs
 */
export function useConfirmationDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<(() => void) | null>(
    null
  );

  const openDialog = React.useCallback((action: () => void) => {
    setPendingAction(() => action);
    setIsOpen(true);
  }, []);

  const closeDialog = React.useCallback(() => {
    setIsOpen(false);
    setPendingAction(null);
  }, []);

  const confirm = React.useCallback(() => {
    if (pendingAction) {
      pendingAction();
    }
    closeDialog();
  }, [pendingAction, closeDialog]);

  return {
    isOpen,
    openDialog,
    closeDialog,
    confirm,
  };
}
