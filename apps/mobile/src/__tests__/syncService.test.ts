import { SyncService } from '../services/syncService'
import { useOfflineStore } from '../store'
import { database } from '../database'

// Mock dependencies
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}))

jest.mock('../database', () => ({
  database: {
    getPendingOfflineActions: jest.fn(),
    deleteOfflineAction: jest.fn(),
    updateOfflineActionStatus: jest.fn(),
    saveQuestions: jest.fn(),
  },
}))

jest.mock('../store', () => ({
  useOfflineStore: {
    getState: jest.fn(),
  },
}))

describe('SyncService', () => {
  let syncService: SyncService
  let mockOfflineStore: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockOfflineStore = {
      setOnlineStatus: jest.fn(),
      updateSyncStatus: jest.fn(),
      pendingActions: [],
      isOnline: true,
      syncStatus: {
        lastSyncTime: '2024-01-01T00:00:00Z',
        pendingUploads: 0,
        pendingDownloads: 0,
        isOnline: true,
        syncInProgress: false,
      },
    }
    ;(useOfflineStore.getState as jest.Mock).mockReturnValue(mockOfflineStore)
    ;(database.getPendingOfflineActions as jest.Mock).mockResolvedValue([])

    syncService = new SyncService({
      batchSize: 5,
      retryDelay: 1000,
      maxRetries: 2,
      conflictResolution: 'SERVER_WINS',
    })
  })

  afterEach(() => {
    syncService.destroy()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const defaultSyncService = new SyncService()
      expect(defaultSyncService).toBeDefined()
      defaultSyncService.destroy()
    })

    it('should initialize with custom config', () => {
      const customConfig = {
        batchSize: 20,
        retryDelay: 2000,
        maxRetries: 5,
        conflictResolution: 'CLIENT_WINS' as const,
      }

      const customSyncService = new SyncService(customConfig)
      expect(customSyncService).toBeDefined()
      customSyncService.destroy()
    })
  })

  describe('Sync Operations', () => {
    it('should start sync when online', async () => {
      mockOfflineStore.isOnline = true

      await expect(syncService.startSync()).resolves.not.toThrow()
      expect(mockOfflineStore.updateSyncStatus).toHaveBeenCalledWith({ syncInProgress: true })
    })

    it('should not start sync when offline', async () => {
      mockOfflineStore.isOnline = false

      await syncService.startSync()

      // Should not update sync status to in progress
      expect(mockOfflineStore.updateSyncStatus).not.toHaveBeenCalledWith({ syncInProgress: true })
    })

    it('should not start sync when already in progress', async () => {
      // Start first sync
      const firstSync = syncService.startSync()

      // Try to start second sync
      const secondSync = syncService.startSync()

      await Promise.all([firstSync, secondSync])

      // Should only call updateSyncStatus once for the first sync
      expect(mockOfflineStore.updateSyncStatus).toHaveBeenCalledTimes(2) // start and end
    })
  })

  describe('Offline Action Processing', () => {
    it('should process pending offline actions', async () => {
      const mockActions = [
        {
          id: 'action-1',
          type: 'ANSWER_QUESTION',
          payload: { questionId: 'q1', answer: 'A' },
          timestamp: '2024-01-01T10:00:00Z',
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'action-2',
          type: 'UPDATE_PROFILE',
          payload: { name: 'Test User' },
          timestamp: '2024-01-01T10:01:00Z',
          retryCount: 0,
          maxRetries: 3,
        },
      ]

      ;(database.getPendingOfflineActions as jest.Mock).mockResolvedValue(mockActions)

      await syncService.startSync()

      expect(database.deleteOfflineAction).toHaveBeenCalledWith('action-1')
      expect(database.deleteOfflineAction).toHaveBeenCalledWith('action-2')
    })

    it('should handle failed actions with retry', async () => {
      const mockAction = {
        id: 'failing-action',
        type: 'ANSWER_QUESTION',
        payload: { questionId: 'q1' },
        timestamp: '2024-01-01T10:00:00Z',
        retryCount: 1,
        maxRetries: 3,
      }

      ;(database.getPendingOfflineActions as jest.Mock).mockResolvedValue([mockAction])

      // Mock a failure in processing
      const originalConsoleError = console.error
      console.error = jest.fn()

      await syncService.startSync()

      console.error = originalConsoleError

      expect(database.updateOfflineActionStatus).toHaveBeenCalledWith(
        'failing-action',
        'pending',
        2,
      )
    })

    it('should remove actions that exceed max retries', async () => {
      const mockAction = {
        id: 'max-retry-action',
        type: 'ANSWER_QUESTION',
        payload: { questionId: 'q1' },
        timestamp: '2024-01-01T10:00:00Z',
        retryCount: 3,
        maxRetries: 3,
      }

      ;(database.getPendingOfflineActions as jest.Mock).mockResolvedValue([mockAction])

      const originalConsoleError = console.error
      console.error = jest.fn()

      await syncService.startSync()

      console.error = originalConsoleError

      expect(database.deleteOfflineAction).toHaveBeenCalledWith('max-retry-action')
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve conflicts with CLIENT_WINS strategy', async () => {
      const clientWinsSyncService = new SyncService({
        conflictResolution: 'CLIENT_WINS',
      })

      const conflict = {
        clientData: { name: 'Client Name', updatedAt: '2024-01-01T12:00:00Z' },
        serverData: { name: 'Server Name', updatedAt: '2024-01-01T11:00:00Z' },
      }

      const resolution = await (clientWinsSyncService as any).resolveConflict(conflict)

      expect(resolution.type).toBe('CLIENT_WINS')
      expect(resolution.resolvedData).toEqual(conflict.clientData)

      clientWinsSyncService.destroy()
    })

    it('should resolve conflicts with SERVER_WINS strategy', async () => {
      const conflict = {
        clientData: { name: 'Client Name', updatedAt: '2024-01-01T12:00:00Z' },
        serverData: { name: 'Server Name', updatedAt: '2024-01-01T13:00:00Z' },
      }

      const resolution = await (syncService as any).resolveConflict(conflict)

      expect(resolution.type).toBe('SERVER_WINS')
      expect(resolution.resolvedData).toEqual(conflict.serverData)
    })

    it('should resolve conflicts with MERGE strategy', async () => {
      const mergeSyncService = new SyncService({
        conflictResolution: 'MERGE',
      })

      const conflict = {
        clientData: { name: 'Client Name', score: 100, updatedAt: '2024-01-01T12:00:00Z' },
        serverData: { name: 'Server Name', level: 5, updatedAt: '2024-01-01T13:00:00Z' },
      }

      const resolution = await (mergeSyncService as any).resolveConflict(conflict)

      expect(resolution.type).toBe('MERGE')
      expect(resolution.resolvedData).toEqual({
        name: 'Client Name',
        score: 100,
        level: 5,
        updatedAt: '2024-01-01T13:00:00Z', // Server timestamp wins
      })

      mergeSyncService.destroy()
    })
  })

  describe('Sync Statistics', () => {
    it('should return correct sync statistics', () => {
      mockOfflineStore.pendingActions = [
        { id: '1', type: 'ANSWER_QUESTION' },
        { id: '2', type: 'UPDATE_PROFILE' },
      ]

      const stats = syncService.getSyncStats()

      expect(stats.pendingActions).toBe(2)
      expect(stats.lastSyncTime).toBe('2024-01-01T00:00:00Z')
      expect(stats.syncInProgress).toBe(false)
    })
  })

  describe('Manual Sync Operations', () => {
    it('should force sync when requested', async () => {
      await expect(syncService.forcSync()).resolves.not.toThrow()
      expect(mockOfflineStore.updateSyncStatus).toHaveBeenCalledWith({ syncInProgress: true })
    })

    it('should sync specific data types', async () => {
      await expect(syncService.syncDataType('questions')).resolves.not.toThrow()
      await expect(syncService.syncDataType('achievements')).resolves.not.toThrow()
      await expect(syncService.syncDataType('friends')).resolves.not.toThrow()
    })

    it('should handle unknown data types gracefully', async () => {
      const originalConsoleWarn = console.warn
      console.warn = jest.fn()

      await syncService.syncDataType('unknown-type')

      expect(console.warn).toHaveBeenCalledWith('Unknown data type: unknown-type')
      console.warn = originalConsoleWarn
    })
  })

  describe('Error Handling', () => {
    it('should handle sync errors gracefully', async () => {
      // Mock database error
      ;(database.getPendingOfflineActions as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      )

      const originalConsoleError = console.error
      console.error = jest.fn()

      await syncService.startSync()

      expect(console.error).toHaveBeenCalledWith('Sync failed:', expect.any(Error))
      expect(mockOfflineStore.updateSyncStatus).toHaveBeenCalledWith({ syncInProgress: false })

      console.error = originalConsoleError
    })

    it('should schedule retry on sync failure', async () => {
      // Mock database error
      ;(database.getPendingOfflineActions as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      )

      const originalConsoleError = console.error
      console.error = jest.fn()

      await syncService.startSync()

      // Verify retry was scheduled (timeout should be set)
      expect((syncService as any).retryTimeouts.size).toBeGreaterThan(0)

      console.error = originalConsoleError
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      // Add some retry timeouts
      ;(syncService as any).retryTimeouts.set(
        'test-1',
        setTimeout(() => {}, 1000),
      )
      ;(syncService as any).retryTimeouts.set(
        'test-2',
        setTimeout(() => {}, 2000),
      )

      expect((syncService as any).retryTimeouts.size).toBe(2)

      syncService.destroy()

      expect((syncService as any).retryTimeouts.size).toBe(0)
    })
  })
})
