'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useGDPR } from '@/contexts/GDPRContext';
import { ConsentPreferences } from '@/types/user-service';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Check, Info, History, Shield } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface ConsentManagerProps {
  onConsentChange?: (consent: ConsentPreferences) => void;
  showHistory?: boolean;
  className?: string;
}

interface ConsentOption {
  key: keyof ConsentPreferences;
  title: string;
  description: string;
  purpose: string;
  legalBasis: string;
  required: boolean;
  icon: string;
}

const CONSENT_OPTIONS: ConsentOption[] = [
  {
    key: 'analytics',
    title: 'Analytics & Performance',
    description: 'Allow us to collect anonymous usage data to improve our service',
    purpose: 'Service improvement and performance optimization',
    legalBasis: 'Legitimate interest / Consent',
    required: false,
    icon: '📊',
  },
  {
    key: 'marketing',
    title: 'Marketing Communications',
    description: 'Receive promotional emails, newsletters, and product updates',
    purpose: 'Marketing communications and product updates',
    legalBasis: 'Consent',
    required: false,
    icon: '📧',
  },
  {
    key: 'personalization',
    title: 'Personalization',
    description: 'Personalize your learning experience based on your preferences',
    purpose: 'Content personalization and recommendation engine',
    legalBasis: 'Consent',
    required: false,
    icon: '🎯',
  },
  {
    key: 'thirdPartySharing',
    title: 'Third-Party Sharing',
    description: 'Share anonymized data with educational partners for research',
    purpose: 'Educational research and industry insights',
    legalBasis: 'Consent',
    required: false,
    icon: '🤝',
  },
];

export function ConsentManager({
  onConsentChange,
  showHistory: showHistoryProp = false,
  className,
}: ConsentManagerProps) {
  const {
    state,
    grantConsent,
    withdrawConsent,
    getConsentHistory,
    isUpdating,
    error,
  } = useGDPR();

  const [showHistory, setShowHistory] = useState(showHistoryProp);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const consentPreferences = state.consentPreferences;
  const consentHistory = getConsentHistory();

  const handleConsentToggle = async (
    key: keyof ConsentPreferences,
    granted: boolean
  ) => {
    try {
      if (granted) {
        await grantConsent(key, `User granted ${key} consent`);
        toast.success(`${key} consent granted`);
      } else {
        await withdrawConsent(key, `User withdrew ${key} consent`);
        toast.success(`${key} consent withdrawn`);
      }

      if (consentPreferences) {
        onConsentChange?.({ ...consentPreferences, [key]: granted });
      }
    } catch (error) {
      toast.error('Failed to update consent');
    }
  };

  const handleAcceptAll = async () => {
    try {
      for (const option of CONSENT_OPTIONS) {
        await grantConsent(option.key, 'User accepted all consents');
      }
      toast.success('All consents granted');
    } catch (error) {
      toast.error('Failed to accept all consents');
    }
  };

  const handleRejectAll = async () => {
    try {
      for (const option of CONSENT_OPTIONS) {
        await withdrawConsent(option.key, 'User rejected all consents');
      }
      toast.success('All consents withdrawn');
    } catch (error) {
      toast.error('Failed to reject all consents');
    }
  };

  const toggleExpanded = (key: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  if (!consentPreferences) {
    return <ConsentManagerSkeleton className={className} />;
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="border-b p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Consent Management</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Control how your data is used and processed
            </p>
          </div>
          <Shield className="h-8 w-8 text-primary" />
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-6 rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-b bg-muted/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Quick Actions</h3>
            <p className="text-sm text-muted-foreground">Manage all consents at once</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcceptAll}
              disabled={isUpdating}
            >
              <Check className="mr-2 h-4 w-4" />
              Accept All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
              disabled={isUpdating}
            >
              Reject All
            </Button>
          </div>
        </div>
      </div>

      {/* Consent Options */}
      <div className="p-6 space-y-4">
        {CONSENT_OPTIONS.map((option) => {
          const isGranted = consentPreferences[option.key] === true;
          const isExpanded = expandedItems.has(option.key);

          return (
            <div key={option.key} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{option.title}</h3>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => toggleExpanded(option.key)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Click for more details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-2 rounded-lg bg-muted p-3 text-sm">
                      <div>
                        <span className="font-medium">Purpose:</span> {option.purpose}
                      </div>
                      <div>
                        <span className="font-medium">Legal Basis:</span> {option.legalBasis}
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col items-end gap-2">
                  <Switch
                    checked={isGranted}
                    onCheckedChange={(checked) => handleConsentToggle(option.key, checked)}
                    disabled={isUpdating || option.required}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isGranted ? 'text-green-600' : 'text-muted-foreground'
                    )}
                  >
                    {isGranted ? 'Granted' : 'Not granted'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Consent History */}
      {showHistory && (
        <>
          <Separator />
          <Collapsible open={showHistory} onOpenChange={setShowHistory}>
            <div className="p-6">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span className="font-semibold">Consent History</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {consentHistory.length} entries
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-3">
                {consentHistory.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <History className="mx-auto mb-2 h-8 w-8" />
                    <p>No consent history available</p>
                  </div>
                ) : (
                  consentHistory.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="rounded-lg border bg-muted/50 p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                entry.granted
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                              )}
                            >
                              {entry.granted ? 'Granted' : 'Withdrawn'}
                            </span>
                            <span className="text-sm font-medium">{entry.consentType}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{entry.purpose}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Legal basis: {entry.legalBasis}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{entry.timestamp.toLocaleDateString()}</div>
                          <div>{entry.timestamp.toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </>
      )}

      {/* Legal Information */}
      <div className="border-t bg-muted/50 p-6">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-primary" />
          <div className="text-sm">
            <h4 className="font-semibold">Your Rights</h4>
            <p className="mt-1 text-muted-foreground">
              You can withdraw your consent at any time. This will not affect the lawfulness of
              processing based on consent before its withdrawal. You also have the right to access,
              rectify, erase, restrict processing, and data portability.
            </p>
            <p className="mt-2 text-muted-foreground">
              For more information about your rights and how we process your data, please see our
              Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentManagerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="border-b p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
