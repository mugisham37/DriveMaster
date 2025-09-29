import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  User,
  Question,
  LearningSession,
  KnowledgeState,
  SyncStatus,
  Achievement,
  Friend,
  OfflineAction,
  AuthTokens,
} from '../types'

// Auth Store
interface AuthState {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          // This will be implemented when we connect to the backend
          // For now, simulate login
          const mockUser: User = {
            id: 'user-1',
            email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          const mockTokens: AuthTokens = {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          }

          set({
            user: mockUser,
            tokens: mockTokens,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        })
      },

      refreshToken: async () => {
        const { tokens } = get()
        if (!tokens) return

        // Implement token refresh logic
        // For now, just extend the current token
        const newTokens: AuthTokens = {
          ...tokens,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }
        set({ tokens: newTokens })
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({
            user: {
              ...user,
              ...userData,
              updatedAt: new Date().toISOString(),
            },
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

// Learning Store
interface LearningState {
  currentSession: LearningSession | null
  questions: Question[]
  knowledgeStates: KnowledgeState[]
  achievements: Achievement[]
  isLoading: boolean
  startSession: (category?: string) => void
  endSession: () => void
  answerQuestion: (questionId: string, answer: string, responseTime: number) => void
  loadQuestions: (category?: string) => Promise<void>
  updateKnowledgeState: (conceptId: string, mastery: number) => void
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      questions: [],
      knowledgeStates: [],
      achievements: [],
      isLoading: false,

      startSession: (category) => {
        const sessionId = `session-${Date.now()}`
        const newSession: LearningSession = {
          id: sessionId,
          userId: useAuthStore.getState().user?.id || '',
          startTime: new Date().toISOString(),
          questionsAnswered: 0,
          correctAnswers: 0,
          totalScore: 0,
          category: category as any,
          isCompleted: false,
        }
        set({ currentSession: newSession })
      },

      endSession: () => {
        const { currentSession } = get()
        if (currentSession) {
          const completedSession: LearningSession = {
            ...currentSession,
            endTime: new Date().toISOString(),
            isCompleted: true,
          }
          set({ currentSession: null })
          // Add to offline sync queue
          useOfflineStore.getState().addAction({
            type: 'SYNC_PROGRESS',
            payload: completedSession,
          })
        }
      },

      answerQuestion: (questionId, answer, responseTime) => {
        const { currentSession, questions } = get()
        if (!currentSession) return

        const question = questions.find((q) => q.id === questionId)
        const isCorrect = question?.correctAnswer === answer

        const updatedSession: LearningSession = {
          ...currentSession,
          questionsAnswered: currentSession.questionsAnswered + 1,
          correctAnswers: currentSession.correctAnswers + (isCorrect ? 1 : 0),
          totalScore: currentSession.totalScore + (isCorrect ? 10 : 0),
        }

        set({ currentSession: updatedSession })

        // Add to offline sync queue
        useOfflineStore.getState().addAction({
          type: 'ANSWER_QUESTION',
          payload: {
            questionId,
            selectedAnswer: answer,
            isCorrect,
            responseTime,
            timestamp: new Date().toISOString(),
          },
        })
      },

      loadQuestions: async (category) => {
        set({ isLoading: true })
        try {
          // Mock questions for now
          const mockQuestions: Question[] = [
            {
              id: 'q1',
              title: 'Stop Sign Recognition',
              content: 'What should you do when you see a stop sign?',
              category: 'traffic-signs',
              difficulty: 0.3,
              options: [
                { id: 'a', text: 'Slow down', isCorrect: false },
                { id: 'b', text: 'Come to a complete stop', isCorrect: true },
                { id: 'c', text: 'Yield to traffic', isCorrect: false },
              ],
              correctAnswer: 'b',
              explanation: 'You must come to a complete stop at a stop sign.',
              version: 1,
            },
          ]
          set({ questions: mockQuestions, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      updateKnowledgeState: (conceptId, mastery) => {
        const { knowledgeStates } = get()
        const existingIndex = knowledgeStates.findIndex((ks) => ks.conceptId === conceptId)

        const updatedState: KnowledgeState = {
          id: existingIndex >= 0 ? knowledgeStates[existingIndex].id : `ks-${Date.now()}`,
          userId: useAuthStore.getState().user?.id || '',
          conceptId,
          masteryProbability: mastery,
          lastUpdated: new Date().toISOString(),
          reviewCount: existingIndex >= 0 ? knowledgeStates[existingIndex].reviewCount + 1 : 1,
          nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }

        if (existingIndex >= 0) {
          const newStates = [...knowledgeStates]
          newStates[existingIndex] = updatedState
          set({ knowledgeStates: newStates })
        } else {
          set({ knowledgeStates: [...knowledgeStates, updatedState] })
        }
      },
    }),
    {
      name: 'learning-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

// Social Store
interface SocialState {
  friends: Friend[]
  leaderboard: any[]
  isLoading: boolean
  loadFriends: () => Promise<void>
  addFriend: (friendId: string) => Promise<void>
  loadLeaderboard: () => Promise<void>
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set) => ({
      friends: [],
      leaderboard: [],
      isLoading: false,

      loadFriends: async () => {
        set({ isLoading: true })
        try {
          // Mock friends data
          const mockFriends: Friend[] = []
          set({ friends: mockFriends, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      addFriend: async (friendId) => {
        // Add to offline sync queue
        useOfflineStore.getState().addAction({
          type: 'ADD_FRIEND',
          payload: { friendId },
        })
      },

      loadLeaderboard: async () => {
        set({ isLoading: true })
        try {
          // Mock leaderboard data
          set({ leaderboard: [], isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
    }),
    {
      name: 'social-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

// Offline Store
interface OfflineState {
  syncStatus: SyncStatus
  pendingActions: OfflineAction[]
  isOnline: boolean
  addAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>) => void
  removeAction: (actionId: string) => void
  updateSyncStatus: (status: Partial<SyncStatus>) => void
  setOnlineStatus: (isOnline: boolean) => void
  processPendingActions: () => Promise<void>
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      syncStatus: {
        lastSyncTime: new Date().toISOString(),
        pendingUploads: 0,
        pendingDownloads: 0,
        isOnline: true,
        syncInProgress: false,
      },
      pendingActions: [],
      isOnline: true,

      addAction: (action) => {
        const { pendingActions } = get()
        const newAction: OfflineAction = {
          ...action,
          id: `action-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        }

        set({
          pendingActions: [...pendingActions, newAction],
          syncStatus: {
            ...get().syncStatus,
            pendingUploads: pendingActions.length + 1,
          },
        })
      },

      removeAction: (actionId) => {
        const { pendingActions } = get()
        const filteredActions = pendingActions.filter((action) => action.id !== actionId)
        set({
          pendingActions: filteredActions,
          syncStatus: {
            ...get().syncStatus,
            pendingUploads: filteredActions.length,
          },
        })
      },

      updateSyncStatus: (status) => {
        set({
          syncStatus: {
            ...get().syncStatus,
            ...status,
          },
        })
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline })
        if (isOnline) {
          // Trigger sync when coming back online
          get().processPendingActions()
        }
      },

      processPendingActions: async () => {
        const { pendingActions, isOnline } = get()
        if (!isOnline || pendingActions.length === 0) return

        set({
          syncStatus: {
            ...get().syncStatus,
            syncInProgress: true,
          },
        })

        for (const action of pendingActions) {
          try {
            // Process each action
            // This will be implemented when we connect to the backend
            console.log('Processing offline action:', action)

            // Remove successful action
            get().removeAction(action.id)
          } catch (error) {
            // Increment retry count
            const updatedActions = pendingActions.map((a) =>
              a.id === action.id ? { ...a, retryCount: a.retryCount + 1 } : a,
            )

            // Remove if max retries reached
            const finalActions = updatedActions.filter(
              (a) => a.id !== action.id || a.retryCount < a.maxRetries,
            )

            set({ pendingActions: finalActions })
          }
        }

        set({
          syncStatus: {
            ...get().syncStatus,
            syncInProgress: false,
            lastSyncTime: new Date().toISOString(),
          },
        })
      },
    }),
    {
      name: 'offline-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
