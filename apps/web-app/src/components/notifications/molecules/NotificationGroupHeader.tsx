'use client';

import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { NotificationBadge } from '../atoms/NotificationBadge';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface NotificationGroupHeaderProps {
  title: string;
  count: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function NotificationGroupHeader({
  title,
  count,
  collapsible = true,
  defaultExpanded = true,
  onToggle,
  actions,
  className,
  children,
}: NotificationGroupHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const storageKey = `notification-group-${title.toLowerCase().replace(/\s+/g, '-')}`;

  // Load collapsed state from localStorage
  useEffect(() => {
    if (collapsible) {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setIsExpanded(stored === 'true');
      }
    }
  }, [collapsible, storageKey]);

  const handleToggle = () => {
    if (!collapsible) return;

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // Save to localStorage
    localStorage.setItem(storageKey, String(newExpanded));

    // Call callback
    onToggle?.(newExpanded);
  };

  if (!collapsible) {
    return (
      <div
        className={cn(
          'flex items-center justify-between py-3 px-4 bg-muted/50 border-b sticky top-0 z-10 backdrop-blur-sm',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <NotificationBadge count={count} variant="normal" />
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={handleToggle}>
      <div
        className={cn(
          'border-b bg-muted/50 sticky top-0 z-10 backdrop-blur-sm',
          className
        )}
      >
        <div className="flex items-center justify-between py-3 px-4">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:bg-transparent p-0 h-auto font-semibold"
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  isExpanded ? 'rotate-0' : '-rotate-90'
                )}
              />
              <span className="text-sm">{title}</span>
              <NotificationBadge count={count} variant="normal" />
            </Button>
          </CollapsibleTrigger>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      <CollapsibleContent className="transition-all duration-200 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
