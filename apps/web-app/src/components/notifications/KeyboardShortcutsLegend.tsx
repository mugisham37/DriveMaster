/**
 * Keyboard Shortcuts Legend
 * 
 * Displays available keyboard shortcuts for notifications
 * Requirements: 19.1, 19.4
 */

"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

export interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'global';
}

const SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { keys: ['Tab'], description: 'Move focus forward', category: 'navigation' },
  { keys: ['Shift', 'Tab'], description: 'Move focus backward', category: 'navigation' },
  { keys: ['↑', '↓'], description: 'Navigate through notifications', category: 'navigation' },
  { keys: ['Enter'], description: 'Open notification', category: 'navigation' },
  { keys: ['Escape'], description: 'Close modal/popover', category: 'navigation' },
  
  // Actions
  { keys: ['Space'], description: 'Select notification (bulk mode)', category: 'actions' },
  { keys: ['Ctrl/Cmd', 'A'], description: 'Select all', category: 'actions' },
  { keys: ['M'], description: 'Mark selected as read', category: 'actions' },
  { keys: ['Delete'], description: 'Delete selected', category: 'actions' },
  
  // Global
  { keys: ['Ctrl/Cmd', 'K'], description: 'Focus search', category: 'global' },
  { keys: ['Ctrl/Cmd', 'S'], description: 'Save (in settings)', category: 'global' },
  { keys: ['?'], description: 'Show this help', category: 'global' },
];

export interface KeyboardShortcutsLegendProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsLegend({ open, onOpenChange }: KeyboardShortcutsLegendProps) {
  const categories = {
    navigation: SHORTCUTS.filter(s => s.category === 'navigation'),
    actions: SHORTCUTS.filter(s => s.category === 'actions'),
    global: SHORTCUTS.filter(s => s.category === 'global'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and interact with notifications efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
              Navigation
            </h3>
            <div className="space-y-2">
              {categories.navigation.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
              Actions
            </h3>
            <div className="space-y-2">
              {categories.actions.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} />
              ))}
            </div>
          </div>

          {/* Global */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
              Global
            </h3>
            <div className="space-y-2">
              {categories.global.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
      <span className="text-sm">{shortcut.description}</span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-xs text-muted-foreground mx-1">+</span>}
            <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
              {key}
            </Badge>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default KeyboardShortcutsLegend;
