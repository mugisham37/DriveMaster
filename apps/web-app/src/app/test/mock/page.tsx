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
import { MockTestSetup, MockTestSession } from '@/components/learning-platform/layer-2-features';
import { MockTestResults as MockTestResultsComponent } from '@/components/learning-platform/layer-2-features/MockTestResults';
import type { ContentItem } from '@/types/entities';
import type { MockTestResults } from '@/components/learning-platform/layer-2-features';

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
  const [testResults, setTestResults] = useState<MockTestResults | null>(null);

  // Fetch mock test questions based on jurisdiction
  // Note: Using search parameter in query string for jurisdiction filtering
  const { items: questions, isLoading: isLoadingQuestions, error: questionsError } = useContentItems(
    selectedJurisdiction ? {
      type: 'question',
      limit: 40, // Standard mock test size
      status: 'published',
      search: selectedJurisdiction, // Use search to filter by jurisdiction
    } : undefined
  );

  // Handle test start
  const handleStartTest = useCallback((jurisdiction: string) => {
    setSelectedJurisdiction(jurisdiction);
    // Questions will be fetched via the hook
    // Once loaded, transition to session phase
  }, []);

  // Handle test completion
  const handleTestComplete = useCallback((results: MockTestResults) => {
    setTestResults(results);
    setPhase('results');
  }, []);

  // Handle exit from test
  const handleExitTest = useCallback(() => {
    setPhase('setup');
    setSelectedJurisdiction('');
    setTestQuestions([]);
  }, []);

  // Handle retake test
  const handleRetakeTest = useCallback(() => {
    setPhase('setup');
    setSelectedJurisdiction('');
    setTestQuestions([]);
    setTestResults(null);
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
  if (isLoadingQuestions && selectedJurisdiction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading test questions...</p>
        </div>
      </div>
    );
  }

  // Show error state if questions failed to load
  if (questionsError && selectedJurisdiction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-bold mb-4">Failed to Load Test</h2>
          <p className="text-muted-foreground mb-6">
            {questionsError.message || 'The test questions could not be loaded. Please try again.'}
          </p>
          <button
            onClick={() => {
              setSelectedJurisdiction('');
              setPhase('setup');
            }}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {phase === 'setup' && (
        <div className="container mx-auto px-4 py-8">
          <MockTestSetup onStart={handleStartTest} />
        </div>
      )}

      {phase === 'session' && testQuestions.length > 0 && (
        <MockTestSession
          questions={testQuestions}
          timeLimit={60}
          onComplete={handleTestComplete}
          onExit={handleExitTest}
        />
      )}

      {phase === 'results' && testResults && (
        <div className="container mx-auto px-4 py-8">
          <MockTestResultsComponent
            results={testResults}
            questions={testQuestions}
            passingScore={80}
            onRetake={handleRetakeTest}
          />
        </div>
      )}
    </div>
  );
}

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
