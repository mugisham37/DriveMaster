"use client";

/**
 * PreferenceToggle - Molecular Component
 * 
 * Labeled toggle switch with description and help text.
 * Provides immediate visual feedback on change.
 * 
 * Requirements: 12.3, 4.9
 */

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PreferenceToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  helpText?: string;
  className?: string;
  id?: string;
}

export function PreferenceToggle({
  label,
  description,
  value,
  onChange,
  disabled = false,
  helpText,
  className,
  id,
}: PreferenceToggleProps) {
  const toggleId = id || `toggle-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={cn("flex items-start justify-between gap-4 py-3", className)}>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={toggleId}
            className={cn(
              "text-sm font-medium leading-none cursor-pointer",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {label}
          </Label>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full hover:bg-accent p-1"
                    aria-label={`Help for ${label}`}
                  >
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {description && (
          <p className={cn(
            "text-sm text-muted-foreground",
            disabled && "opacity-50"
          )}>
            {description}
          </p>
        )}
      </div>

      <Switch
        id={toggleId}
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
        aria-describedby={description ? `${toggleId}-description` : undefined}
      />
    </div>
  );
}

export default PreferenceToggle;
