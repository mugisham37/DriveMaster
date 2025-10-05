import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
    PracticeSession,
    Item,
    SessionProgress,
    NextItemResponse,
    SubmitAttemptResponse,
} from '@/types/practice';

interface PracticeState {
    // Current session
    currentSession: PracticeSession | null;
    currentItem: Item | null;
    currentItemResponse: NextItemResponse | null;
    sessionProgress: SessionProgress | null;

    // UI state
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;

    // Session flow
    showExplanation: boolean;
    selectedAnswer: string | string[] | null;
    startTime: number | null;

    // Settings
    showHints: boolean;
    autoAdvance: boolean;
    timeLimit: number | null;
}

interface PracticeActions {
    // Session management
    setCurrentSession: (session: PracticeSession | null) => void;
    setCurrentItem: (item: Item | null, response?: NextItemResponse | null) => void;
    setSessionProgress: (progress: SessionProgress | null) => void;

    // UI actions
    setLoading: (loading: boolean) => void;
    setSubmitting: (submitting: boolean) => void;
    setError: (error: string | null) => void;

    // Answer handling
    setSelectedAnswer: (answer: string | string[] | null) => void;
    setShowExplanation: (show: boolean) => void;
    startTimer: () => void;
    getElapsedTime: () => number;

    // Settings
    setShowHints: (show: boolean) => void;
    setAutoAdvance: (auto: boolean) => void;
    setTimeLimit: (limit: number | null) => void;

    // Reset
    resetSession: () => void;
    clearError: () => void;
}

type PracticeStore = PracticeState & PracticeActions;

export const usePracticeStore = create<PracticeStore>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        currentSession: null,
        currentItem: null,
        currentItemResponse: null,
        sessionProgress: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        showExplanation: false,
        selectedAnswer: null,
        startTime: null,
        showHints: true,
        autoAdvance: false,
        timeLimit: null,

        // Actions
        setCurrentSession: (session) => set({ currentSession: session }),

        setCurrentItem: (item, response = null) => set({
            currentItem: item,
            currentItemResponse: response,
            selectedAnswer: null,
            showExplanation: false,
            startTime: item ? Date.now() : null,
        }),

        setSessionProgress: (progress) => set({ sessionProgress: progress }),

        setLoading: (isLoading) => set({ isLoading }),

        setSubmitting: (isSubmitting) => set({ isSubmitting }),

        setError: (error) => set({ error }),

        setSelectedAnswer: (selectedAnswer) => set({ selectedAnswer }),

        setShowExplanation: (showExplanation) => set({ showExplanation }),

        startTimer: () => set({ startTime: Date.now() }),

        getElapsedTime: () => {
            const { startTime } = get();
            return startTime ? Date.now() - startTime : 0;
        },

        setShowHints: (showHints) => set({ showHints }),

        setAutoAdvance: (autoAdvance) => set({ autoAdvance }),

        setTimeLimit: (timeLimit) => set({ timeLimit }),

        resetSession: () => set({
            currentSession: null,
            currentItem: null,
            currentItemResponse: null,
            sessionProgress: null,
            showExplanation: false,
            selectedAnswer: null,
            startTime: null,
            error: null,
        }),

        clearError: () => set({ error: null }),
    }))
);