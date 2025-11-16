"use client";

/**
 * Practice Mode Page
 * 
 * Two-phase practice interface: setup and active session
 * Requirements: 7.1, 13.2, 14.3
 */

import React, { useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuthGuards';
import { PracticeSetup, PracticeSession } from '@/components/learning-platform/layer-2-features';
import type { PracticeSettings, SessionSummary } from '@/components/learning-platform/layer-2-features';

type Phase = 'setup' | 'session';

export default function PracticePage() {
  // Authentication check with automatic redirect
  const { user, isRedirecting } = useRequireAuth();

  // Phase management
  const [phase, setPhase] = useState<Phase>('setup');
  const [settings, setSettings] = useState<PracticeSettings | null>(null);

  // Handle practice start
  const handleStart = (practiceSettings: PracticeSettings) => {
    setSettings(practiceSettings);
    setPhase('session');
  };

  // Handle session stop (returns to setup)
  const handleStop = () => {
    setPhase('setup');
    setSettings(null);
  };

  // Handle session completion
  const handleComplete = (summary: SessionSummary) => {
    // Summary is displayed by PracticeSession component
    // After user dismisses summary, they'll be returned to setup
    console.log('Practice session completed:', summary);
    // The PracticeSession component handles the summary display
    // When user clicks "Return to Dashboard" or starts new practice,
    // handleStop will be called to return to setup phase
  };

  // Show loading state while checking authentication
  if (isRedirecting || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {phase === 'setup' && (
        <div className="container mx-auto px-4 py-8">
          <PracticeSetup onStart={handleStart} />
        </div>
      )}

      {phase === 'session' && settings && (
        <PracticeSession
          userId={user.id.toString()}
          settings={settings}
          onStop={handleStop}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
