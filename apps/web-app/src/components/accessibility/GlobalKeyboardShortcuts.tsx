/**
 * GlobalKeyboardShortcuts Component
 * 
 * Provides global keyboard shortcuts for the application.
 * Implements WCAG 2.1 keyboard accessibility requirements.
 * 
 * Requirements: 12.1, 12.4
 * Task: 13.1
 */

'use client';

import * as React from 'react';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  scope?: 'global' | 'lesson' | 'practice' | 'test';
}

// ============================================================================
// Component
// ============================================================================

export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);

  // ============================================================================
  // Determine Current Scope
  // ============================================================================

  const getCurrentScope = useCallback((): 'global' | 'lesson' | 'practice' | 'test' => {
    if (pathname?.includes('/learn/lesson/')) return 'lesson';
    if (pathname?.includes('/practice')) return 'practice';
    if (pathname?.includes('/test/mock')) return 'test';
    return 'global';
  }, [pathname]);

  // ============================================================================
  // Global Shortcuts
  // ============================================================================

  const globalShortcuts: KeyboardShortcut[] = useMemo(() => [
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => setShowHelp(true),
      scope: 'global',
    },
    {
      key: 'h',
      description: 'Go to dashboard',
      action: () => router.push('/learn'),
      scope: 'global',
    },
    {
      key: 'p',
      description: 'Go to learning path',
      action: () => router.push('/learn/path'),
      scope: 'global',
    },
    {
      key: 's',
      description: 'Go to search',
      action: () => router.push('/browse'),
      scope: 'global',
    },
    {
      key: 'a',
      description: 'Go to progress analytics',
      action: () => router.push('/progress'),
      scope: 'global',
    },
  ], [router]);

  // ============================================================================
  // Lesson-Specific Shortcuts
  // ============================================================================

  const lessonShortcuts: KeyboardShortcut[] = useMemo(() => [
    {
      key: '1',
      description: 'Select first choice',
      action: () => {
        const firstChoice = document.querySelector('[data-choice-index="0"]') as HTMLElement;
        firstChoice?.click();
      },
      scope: 'lesson',
    },
    {
      key: '2',
      description: 'Select second choice',
      action: () => {
        const secondChoice = document.querySelector('[data-choice-index="1"]') as HTMLElement;
        secondChoice?.click();
      },
      scope: 'lesson',
    },
    {
      key: '3',
      description: 'Select third choice',
      action: () => {
        const thirdChoice = document.querySelector('[data-choice-index="2"]') as HTMLElement;
        thirdChoice?.click();
      },
      scope: 'lesson',
    },
    {
      key: '4',
      description: 'Select fourth choice',
      action: () => {
        const fourthChoice = document.querySelector('[data-choice-index="3"]') as HTMLElement;
        fourthChoice?.click();
      },
      scope: 'lesson',
    },
    {
      key: 'Enter',
      description: 'Submit answer',
      action: () => {
        const submitButton = document.querySelector('[data-submit-answer]') as HTMLElement;
        submitButton?.click();
      },
      scope: 'lesson',
    },
    {
      key: 'n',
      description: 'Next question',
      action: () => {
        const nextButton = document.querySelector('[data-next-question]') as HTMLElement;
        nextButton?.click();
      },
      scope: 'lesson',
    },
  ], []);

  // ============================================================================
  // Keyboard Event Handler
  // ============================================================================

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const currentScope = getCurrentScope();
      const allShortcuts = [...globalShortcuts, ...lessonShortcuts];

      // Find matching shortcut
      const shortcut = allShortcuts.find((s) => {
        // Check if key matches
        if (s.key !== event.key) return false;

        // Check if scope matches
        if (s.scope !== 'global' && s.scope !== currentScope) return false;

        // Check modifiers
        if (s.modifiers) {
          if (s.modifiers.ctrl && !event.ctrlKey) return false;
          if (s.modifiers.alt && !event.altKey) return false;
          if (s.modifiers.shift && !event.shiftKey) return false;
          if (s.modifiers.meta && !event.metaKey) return false;
        }

        return true;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
    [getCurrentScope, globalShortcuts, lessonShortcuts]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate the application more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Global Shortcuts */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Global Shortcuts</h3>
            <div className="space-y-2">
              {globalShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Lesson Shortcuts */}
          {getCurrentScope() === 'lesson' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Lesson Shortcuts</h3>
              <div className="space-y-2">
                {lessonShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="px-3 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Press <kbd className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded">?</kbd> anytime to see available shortcuts</li>
              <li>Use <kbd className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded">Tab</kbd> to navigate between interactive elements</li>
              <li>Press <kbd className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 rounded">Escape</kbd> to close dialogs and modals</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GlobalKeyboardShortcuts;
