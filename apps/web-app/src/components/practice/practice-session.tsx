"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePracticeStore } from "@/stores/practice-store";
import { useAuth } from "@/contexts/auth-context";
import { practiceApi } from "@/lib/api/practice";
import { QuestionDisplay } from "./question-display";
import { SessionProgress } from "./session-progress";
import { SessionControls } from "./session-controls";
import { ExplanationModal } from "./explanation-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PracticeSessionProps {
  sessionType: "practice" | "review" | "mock_test";
  sessionId?: string;
}

export function PracticeSession({
  sessionType,
  sessionId,
}: PracticeSessionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    currentSession,
    currentItem,
    currentItemResponse,
    sessionProgress,
    isLoading,
    isSubmitting,
    error,
    showExplanation,
    selectedAnswer,
    setCurrentSession,
    setCurrentItem,
    setSessionProgress,
    setLoading,
    setSubmitting,
    setError,
    setShowExplanation,
    getElapsedTime,
    resetSession,
    clearError,
  } = usePracticeStore();

  // Start or resume session
  const startSessionMutation = useMutation({
    mutationFn: () =>
      sessionId
        ? practiceApi.resumeSession(sessionId)
        : practiceApi.startSession(sessionType),
    onSuccess: (session: any) => {
      setCurrentSession(session);
      setIsInitialized(true);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to start session");
    },
  });

  // Get next item
  const nextItemMutation = useMutation({
    mutationFn: () => {
      if (!currentSession || !user) throw new Error("No active session");

      return practiceApi.getNextItem({
        userId: user.id,
        sessionId: currentSession.id,
        sessionType: currentSession.sessionType as "practice" | "review" | "mock_test",
      });
    },
    onSuccess: (response: any) => {
      setCurrentItem(response.item, response);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to get next item");
    },
  });

  // Submit attempt
  const submitAttemptMutation = useMutation({
    mutationFn: (data: {
      selected: string | string[];
      timeTakenMs: number;
      hintsUsed: number;
      confidence: number;
    }) => {
      if (!currentSession || !currentItem)
        throw new Error("No active session or item");

      return practiceApi.submitAttempt({
        sessionId: currentSession.id,
        itemId: currentItem.id,
        selected: data.selected,
        timeTakenMs: data.timeTakenMs,
        hintsUsed: data.hintsUsed,
        confidence: data.confidence,
        clientAttemptId: crypto.randomUUID(),
      });
    },
    onSuccess: (response: any) => {
      setSessionProgress(response.sessionProgress);
      setShowExplanation(true);

      // Auto-advance to next item if enabled and correct
      if (response.correct && response.nextItem) {
        setTimeout(() => {
          setCurrentItem(response.nextItem!.item, response.nextItem);
          setShowExplanation(false);
        }, 3000);
      }
    },
    onError: (error: any) => {
      setError(error.message || "Failed to submit attempt");
    },
  });

  // End session
  const endSessionMutation = useMutation({
    mutationFn: () => {
      if (!currentSession) throw new Error("No active session");
      return practiceApi.endSession(currentSession.id);
    },
    onSuccess: () => {
      resetSession();
      router.push("/dashboard");
    },
    onError: (error: any) => {
      setError(error.message || "Failed to end session");
    },
  });

  // Initialize session on mount
  useEffect(() => {
    if (!isInitialized && !startSessionMutation.isPending) {
      startSessionMutation.mutate();
    }
  }, [isInitialized]);

  // Get first item when session is ready
  useEffect(() => {
    if (currentSession && !currentItem && !nextItemMutation.isPending) {
      nextItemMutation.mutate();
    }
  }, [currentSession, currentItem]);

  const handleSubmitAnswer = (confidence: number = 3) => {
    if (!selectedAnswer || !currentItem) return;

    const timeTakenMs = getElapsedTime();

    setSubmitting(true);
    submitAttemptMutation.mutate({
      selected: selectedAnswer,
      timeTakenMs,
      hintsUsed: 0, // TODO: Track hints used
      confidence,
    });
  };

  const handleNextItem = () => {
    setShowExplanation(false);
    nextItemMutation.mutate();
  };

  const handleEndSession = () => {
    endSessionMutation.mutate();
  };

  if (startSessionMutation.isPending || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Starting your practice session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md mx-auto text-center">
          <div className="p-6">
            <div className="text-red-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Session Error
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={clearError} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading next question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Session Progress */}
        {sessionProgress && (
          <SessionProgress
            progress={sessionProgress}
            sessionType={sessionType}
          />
        )}

        {/* Main Question Area */}
        <div className="mt-6">
          <QuestionDisplay
            item={currentItem}
            selectedAnswer={selectedAnswer}
            onAnswerSelect={(answer) =>
              usePracticeStore.getState().setSelectedAnswer(answer)
            }
            disabled={isSubmitting || showExplanation}
            showHints={usePracticeStore.getState().showHints}
          />
        </div>

        {/* Session Controls */}
        <div className="mt-6">
          <SessionControls
            canSubmit={!!selectedAnswer && !isSubmitting}
            isSubmitting={isSubmitting}
            showExplanation={showExplanation}
            onSubmit={handleSubmitAnswer}
            onNext={handleNextItem}
            onEndSession={handleEndSession}
          />
        </div>

        {/* Explanation Modal */}
        {showExplanation && currentItem && (
          <ExplanationModal
            item={currentItem}
            selectedAnswer={selectedAnswer}
            isCorrect={(submitAttemptMutation.data as any)?.correct || false}
            explanation={(submitAttemptMutation.data as any)?.explanation}
            onNext={handleNextItem}
            onClose={() => setShowExplanation(false)}
          />
        )}
      </div>
    </div>
  );
}
