"use client";

/**
 * Mock Test Page
 * 
 * Full-length timed practice test simulating actual driving test
 * Requirements: 15.1, 13.2, 14.3
 */

import React, { useState, useCallback } from 'react';
import { useRequireAuth } from '@/hooks/useAuthGuards';
import { useContentItems } from '@/hooks/use-content-operations';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { MockTestSetup } from '@/components/learning-platform/layer-2-features';
import type { ContentItem } from '@/types/entities';

type Phase = 'setup' | 'session' | 'results';

/**
 * Mock Test Page Component
 * Provides full-length timed test simulation
 */
function MockTestPage() {
  // Authentication check with automatic redirect
  const { user, isRedirecting } = useRequireAuth();

  // Phase management
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('');
  const [testQuestions, setTestQuestions] = useState<ContentItem[]>([]);

  // Fetch mock test questions based on jurisdiction
  const { items: questions, isLoading: isLoadingQuestions, error: questionsError } = useContentItems(
    selectedJurisdiction ? {
      type: 'question',
      jurisdiction: selectedJurisdiction,
      limit: 40, // Standard mock test size
      status: 'published',
    } : undefined
  );

  // Handle test start
  const handleStartTest = useCallback((jurisdiction: string) => {
    setSelectedJurisdiction(jurisdiction);
    // Questions will be fetched via the hook
    // Once loaded, transition to session phase
  }, []);

  // Effect to transition to session once questions are loaded
  React.useEffect(() => {
    if (selectedJurisdiction && questions.length > 0 && phase === 'setup') {
      setTestQuestions(questions);
      setPhase('session');
    }
  }, [selectedJurisdiction, questions, phase]);

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

  // Show loading state while fetching questions
  if (isLoadingQuestion

/**
 * Export with error boundary wrapper
 */
export default function MockTestPageWithErrorBoundary() {
  return (
    <RouteErrorBoundary>
      <MockTestPage />
    </RouteErrorBoundary>
  );
}
