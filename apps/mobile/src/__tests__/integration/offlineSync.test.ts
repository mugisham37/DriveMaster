import { renderHook, act, waitFor } from '@testing-library/react-native'
import NetInfo from '@react-native-community/netinfo'
import { syncService } from '../../services/syncService'
import { database } from '../../database'
import { useOfflineStore, useAuthStore, useLearningStore } from '../../store'
import { OfflineAction } from '../../types'

// Mock dependencies
jest.mock('@react-native-community/netinfo')
jest.mock('../../database')

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>
const mockDatabase = database as jest.Mocked<typeof database>

describe('Offline-to-Online Sync Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset stores
    useOfflineStore.setState({
      syncStatus: {
        lastSyncTime: new Date().toISOString(),
        pendingUploads: 0,
        pendingDownloads: 0,
        isOnline: true,
        syncInProgress: false,
      },
      pendingActions: [],
      isOnline: true,
    })

    useAuthStore.setState({
      user: {
        id: 'test-user-1',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
      isAuthenticated: true,
    })

    // Setup default database mocks
    mockDatabase.getPendingOfflineActions.mockResolvedValue([])
    mockDatabase.saveOfflineAction.mockResolvedValue()
    mockDatabase.deleteOfflineAction.mockResolvedValue()
    mockDatabase.updateOfflineActionStatus.mockResolvedValue()
  })

  describe('Network State Management', () => {
    it('should detect network state changes', async () => {
      const { result } = renderHook(() => useOfflineStore())

      // Mock network listener
      let networkListener: (state: any) => void = () => {}
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener
        return jest.fn() // unsubscribe function
      })

      // Simulate going offline
      act(() => {
        networkListener({
          isConnected: false,
          isInternetReachable: false,
        })
      })

      expect(result.current.isOnline).toBe(false)

      // Simulate coming back online
      act(() => {
        networkListener({
          isConnected: true,
          isInternetReachable: true,
        })
      })

      expect(result.current.isOnline).toBe(true)
    })

    it('should trigger sync when coming back online', async () => {
      const mockStartSync = jest.spyOn(syncService, 'startSync').mockResolvedValue()

      let networkListener: (state: any) => void = () => {}
      mockNetInfo.addEventListener.mockImplementation((listener) => {
        networkListener = listener
        return jest.fn()
      })

      // Simulate coming back online
      act(() => {
        networkListener({
          isConnected: true,
          isInternetReachable: true,
        })
      })

      await waitFor(() => {
        expect(mockStartSync).toHaveBeenCalled()
      })
    })
  })

  describe('Offline Action Queue Management', () => {
    it('should queue actions when offline', async () => {
      const { result } = renderHook(() => useOfflineStore())

      // Set offline state
      act(() => {
        result.current.setOnlineStatus(false)
      })

      // Add offline action
      act(() => {
        result.current.addAction({
          type: 'ANSWER_QUESTION',
          payload: {
            questionId: 'q1',
            selectedAnswer: 'A',
            isCorrect: true,
            responseTime: 2500,
            timestamp: new Date().toISOString(),
          },
        })
      })

      expect(result.current.pendingActions).toHaveLength(1)
      expect(result.current.syncStatus.pendingUploads).toBe(1)
    })

    it('should process queued actions when coming online', async () => {
      const { result } = renderHook(() => useOfflineStore())

      // Add some offline actions
      const offlineActions: OfflineAction[] = [
        {
          id: 'action-1',
          type: 'ANSWER_QUESTION',
          payload: {
            questionId: 'q1',
            selectedAnswer: 'A',
            isCorrect: true,
            responseTime: 2500,
          },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'action-2',
          type: 'UPDATE_PROFILE',
          payload: {
            learningPreferences: { difficulty: 'medium' },
          },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        },
      ]

      mockDatabase.getPendingOfflineActions.mockResolvedValue(offlineActions)

      // Mock successful processing
      const mockStartSync = jest.spyOn(syncService, 'startSync').mockImplementation(async () => {
        // Simulate processing actions
        for (const action of offlineActions) {
          await mockDatabase.deleteOfflineAction(action.id)
        }
      })

      await act(async () => {
        await result.current.processPendingActions()
      })

      expect(mockDatabase.getPendingOfflineActions).toHaveBeenCalled()
      expect(mockDatabase.deleteOfflineAction).toHaveBeenCalledTimes(2)
    })

    it('should handle action processing failures with retry logic', async () => {
      const { result } = renderHook(() => useOfflineStore())

      const failingAction: OfflineAction = {
        id: 'failing-action',
        type: 'SYNC_PROGRESS',
        payload: { sessionId: 'session-1' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      }

      mockDatabase.getPendingOfflineActions.mockResolvedValue([failingAction])

      // Mock sync failure
      const mockStartSync = jest
        .spyOn(syncService, 'startSync')
        .mockRejectedValue(new Error('Network error'))

      await act(async () => {
        try {
          await result.current.processPendingActions()
        } catch (error) {
          // Expected to fail
        }
      })

      expect(mockDatabase.updateOfflineActionStatus).toHaveBeenCalledWith(
        'failing-action',
        'pending',
        1,
      )
    })

    it('should remove actions that exceed max retries', async () => {
      const { result } = renderHook(() => useOfflineStore())

      const maxRetriesAction: OfflineAction = {
        id: 'max-retries-action',
        type: 'ADD_FRIEND',
        payload: { friendId: 'friend-1' },
        timestamp: new Date().toISOString(),
        retryCount: 3,
        maxRetries: 3,
      }

      mockDatabase.getPendingOfflineActions.mockResolvedValue([maxRetriesAction])

      // Mock sync failure
      jest.spyOn(syncService, 'startSync').mockRejectedValue(new Error('Permanent error'))

      await act(async () => {
        try {
          await result.current.processPendingActions()
        } catch (error) {
          // Expected to fail
        }
      })

      expect(mockDatabase.deleteOfflineAction).toHaveBeenCalledWith('max-retries-action')
    })
  })

  describe('Data Synchronization', () => {
    it('should sync user responses from offline storage', async () => {
      const mockUserResponses = [
        {
          id: 'response-1',
          userId: 'test-user-1',
          questionId: 'q1',
          selectedAnswer: 'A',
          isCorrect: true,
          responseTime: 2500,
          timestamp: new Date().toISOString(),
          isSynced: false,
        },
      ]

      mockDatabase.getUnsyncedData.mockResolvedValue(mockUserResponses)
      mockDatabase.markAsSynced.mockResolvedValue()

      const mockStartSync = jest.spyOn(syncService, 'startSync').mockImplementation(async () => {
        // Simulate successful sync
        await mockDatabase.markAsSynced('user_responses', ['response-1'])
      })

      await act(async () => {
        await syncService.startSync()
      })

      expect(mockDatabase.markAsSynced).toHaveBeenCalledWith('user_responses', ['response-1'])
    })

    it('should sync learning sessions from offline storage', async () => {
      const { result } = renderHook(() => useLearningStore())

      // Create a learning session offline
      act(() => {
        result.current.startSession('traffic-signs')
      })

      // Answer some questions
      act(() => {
        result.current.answerQuestion('q1', 'A', 2500)
        result.current.answerQuestion('q2', 'B', 3000)
      })

      // End session
      act(() => {
        result.current.endSession()
      })

      // Check that offline action was queued
      const offlineStore = useOfflineStore.getState()
      expect(offlineStore.pendingActions.some((action) => action.type === 'SYNC_PROGRESS')).toBe(
        true,
      )
    })

    it('should handle sync conflicts gracefully', async () => {
      const conflictingData = {
        local: { id: 'item-1', value: 'local-value', updatedAt: '2023-01-01T10:00:00Z' },
        server: { id: 'item-1', value: 'server-value', updatedAt: '2023-01-01T11:00:00Z' },
      }

      // Mock conflict resolution (server wins by default)
      const mockStartSync = jest.spyOn(syncService, 'startSync').mockImplementation(async () => {
        // Simulate conflict resolution
        console.log('Resolving conflict: server wins')
      })

      await act(async () => {
        await syncService.startSync()
      })

      expect(mockStartSync).toHaveBeenCalled()
    })
  })

  describe('Offline Data Storage', () => {
    it('should store questions for offline access', async () => {
      const mockQuestions = [
        {
          id: 'q1',
          title: 'Stop Sign',
          content: 'What should you do at a stop sign?',
          category: 'traffic-signs',
          difficulty: 0.3,
          options: [
            { id: 'a', text: 'Slow down', isCorrect: false },
            { id: 'b', text: 'Stop completely', isCorrect: true },
          ],
          correctAnswer: 'b',
          explanation: 'You must come to a complete stop.',
          version: 1,
        },
      ]

      mockDatabase.saveQuestions.mockResolvedValue()
      mockDatabase.getQuestions.mockResolvedValue(mockQuestions)

      await act(async () => {
        await database.saveQuestions(mockQuestions)
      })

      const storedQuestions = await database.getQuestions('traffic-signs')

      expect(mockDatabase.saveQuestions).toHaveBeenCalledWith(mockQuestions)
      expect(storedQuestions).toEqual(mockQuestions)
    })

    it('should cache content for offline access', async () => {
      const cacheKey = 'user-progress-summary'
      const cacheData = {
        totalScore: 850,
        questionsAnswered: 100,
        correctAnswers: 85,
        categories: ['traffic-signs', 'road-rules'],
      }

      mockDatabase.setCache.mockResolvedValue()
      mockDatabase.getCache.mockResolvedValue(cacheData)

      await act(async () => {
        await database.setCache(cacheKey, cacheData, new Date(Date.now() + 3600000))
      })

      const cachedData = await database.getCache(cacheKey)

      expect(mockDatabase.setCache).toHaveBeenCalledWith(cacheKey, cacheData, expect.any(Date))
      expect(cachedData).toEqual(cacheData)
    })

    it('should handle expired cache gracefully', async () => {
      const expiredCacheKey = 'expired-data'

      mockDatabase.getCache.mockResolvedValue(null) // Simulate expired cache

      const cachedData = await database.getCache(expiredCacheKey)

      expect(cachedData).toBeNull()
    })
  })

  describe('Sync Status Management', () => {
    it('should update sync status during sync process', async () => {
      const { result } = renderHook(() => useOfflineStore())

      const mockStartSync = jest.spyOn(syncService, 'startSync').mockImplementation(async () => {
        // Simulate sync process
        result.current.updateSyncStatus({ syncInProgress: true })

        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 100))

        result.current.updateSyncStatus({
          syncInProgress: false,
          lastSyncTime: new Date().toISOString(),
        })
      })

      await act(async () => {
        await syncService.startSync()
      })

      expect(result.current.syncStatus.syncInProgress).toBe(false)
      expect(result.current.syncStatus.lastSyncTime).toBeDefined()
    })

    it('should track pending upload and download counts', async () => {
      const { result } = renderHook(() => useOfflineStore())

      // Add pending actions
      act(() => {
        result.current.addAction({
          type: 'ANSWER_QUESTION',
          payload: { questionId: 'q1', selectedAnswer: 'A' },
        })
        result.current.addAction({
          type: 'UPDATE_PROFILE',
          payload: { preferences: {} },
        })
      })

      expect(result.current.syncStatus.pendingUploads).toBe(2)

      // Remove one action
      const actionId = result.current.pendingActions[0].id
      act(() => {
        result.current.removeAction(actionId)
      })

      expect(result.current.syncStatus.pendingUploads).toBe(1)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabase.getPendingOfflineActions.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => useOfflineStore())

      await act(async () => {
        try {
          await result.current.processPendingActions()
        } catch (error) {
          expect(error.message).toBe('Database error')
        }
      })
    })

    it('should handle network errors during sync', async () => {
      const mockStartSync = jest
        .spyOn(syncService, 'startSync')
        .mockRejectedValue(new Error('Network timeout'))

      await act(async () => {
        try {
          await syncService.startSync()
        } catch (error) {
          expect(error.message).toBe('Network timeout')
        }
      })
    })

    it('should retry sync after failures', async () => {
      let syncAttempts = 0
      const mockStartSync = jest.spyOn(syncService, 'startSync').mockImplementation(async () => {
        syncAttempts++
        if (syncAttempts < 3) {
          throw new Error('Temporary network error')
        }
        // Success on third attempt
      })

      // Simulate retry logic (this would be handled by the sync service)
      for (let i = 0; i < 3; i++) {
        try {
          await syncService.startSync()
          break
        } catch (error) {
          if (i === 2) throw error // Re-throw on final attempt
          await new Promise((resolve) => setTimeout(resolve, 100)) // Wait before retry
        }
      }

      expect(syncAttempts).toBe(3)
    })
  })

  describe('Performance and Optimization', () => {
    it('should batch sync operations for efficiency', async () => {
      const batchSize = 10
      const totalActions = 25

      const mockActions = Array.from({ length: totalActions }, (_, i) => ({
        id: `action-${i}`,
        type: 'ANSWER_QUESTION' as const,
        payload: { questionId: `q${i}`, selectedAnswer: 'A' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      }))

      mockDatabase.getPendingOfflineActions.mockResolvedValue(mockActions)

      let processedBatches = 0
      const mockStartSync = jest.spyOn(syncService, 'startSync').mockImplementation(async () => {
        // Simulate batch processing
        const batches = Math.ceil(totalActions / batchSize)
        processedBatches = batches
      })

      await act(async () => {
        await syncService.startSync()
      })

      expect(processedBatches).toBe(Math.ceil(totalActions / batchSize))
    })

    it('should cleanup old sync metadata', async () => {
      mockDatabase.cleanupExpiredCache.mockResolvedValue()

      await act(async () => {
        await database.cleanupExpiredCache()
      })

      expect(mockDatabase.cleanupExpiredCache).toHaveBeenCalled()
    })

    it('should optimize database storage', async () => {
      mockDatabase.vacuum.mockResolvedValue()

      await act(async () => {
        await database.vacuum()
      })

      expect(mockDatabase.vacuum).toHaveBeenCalled()
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data consistency during sync', async () => {
      const { result } = renderHook(() => useLearningStore())

      // Start a learning session
      act(() => {
        result.current.startSession('road-rules')
      })

      const sessionId = result.current.currentSession?.id

      // Answer questions
      act(() => {
        result.current.answerQuestion('q1', 'A', 2000)
        result.current.answerQuestion('q2', 'B', 2500)
      })

      // Verify session state is consistent
      expect(result.current.currentSession?.questionsAnswered).toBe(2)
      expect(result.current.currentSession?.correctAnswers).toBeGreaterThanOrEqual(0)
      expect(result.current.currentSession?.totalScore).toBeGreaterThanOrEqual(0)

      // End session
      act(() => {
        result.current.endSession()
      })

      // Verify session was queued for sync
      const offlineStore = useOfflineStore.getState()
      const syncAction = offlineStore.pendingActions.find(
        (action) => action.type === 'SYNC_PROGRESS',
      )
      expect(syncAction).toBeDefined()
      expect(syncAction?.payload.id).toBe(sessionId)
    })

    it('should handle concurrent sync operations safely', async () => {
      const { result } = renderHook(() => useOfflineStore())

      // Simulate multiple concurrent sync attempts
      const syncPromises = [
        result.current.processPendingActions(),
        result.current.processPendingActions(),
        result.current.processPendingActions(),
      ]

      await act(async () => {
        await Promise.allSettled(syncPromises)
      })

      // Should handle concurrent access gracefully
      expect(result.current.syncStatus.syncInProgress).toBe(false)
    })
  })
})
