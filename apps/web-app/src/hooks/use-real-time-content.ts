/**
 * Real-time Content Hooks
 * 
 * React hooks for real-time content updates, presence tracking,
 * and collaboration features using WebSocket integration.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { contentServiceClient, getWebSocketManager } from '@/lib/content-service'
import type {
  ContentChangeNotification,
  CollaborationEvent,
  UserPresence,
  CollaborationSession,
  WebSocketConnectionState,
  WebSocketMetrics
} from '@/types/websocket'
import type { ContentItem } from '@/types/entities'

// ============================================================================
// Real-time Content Updates Hook
// ============================================================================

export interface UseRealTimeContentOptions {
  itemId: string
  enabled?: boolean
  includePresence?: boolean
  includeCollaboration?: boolean
  onContentChanged?: (notification: ContentChangeNotification) => void
  onPresenceUpdated?: (users: UserPresence[]) => void
  onCollaborationEvent?: (event: CollaborationEvent) => void
}

export interface UseRealTimeContentReturn {
  isConnected: boolean
  connectionState: WebSocketConnectionState
  activeUsers: UserPresence[]
  collaborationSession: CollaborationSession | null
  subscriptionIds: string[]
  updatePresence: (status: 'active' | 'idle' | 'away') => void
  sendCursorPosition: (position: { line: number; column: number }) => void
  sendTextSelection: (selection: { start: number; end: number; text: string }) => void
  connect: () => Promise<void>
  disconnect: () => void
}

/**
 * Hook for real-time content updates and collaboration
 * Requirements: 9.1, 9.2, 9.3
 */
export function useRealTimeContent(options: UseRealTimeContentOptions): UseRealTimeContentReturn {
  const {
    itemId,
    enabled = true,
    includePresence = true,
    includeCollaboration = true,
    onPresenceUpdated,
    // onContentChanged and onCollaborationEvent reserved for future implementation
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('disconnected')
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([])
  const [collaborationSession, setCollaborationSession] = useState<CollaborationSession | null>(null)
  const [subscriptionIds, setSubscriptionIds] = useState<string[]>([])

  const webSocketManager = useRef(getWebSocketManager())
  const handlersSetup = useRef(false)

  // Setup WebSocket event handlers
  useEffect(() => {
    if (handlersSetup.current || !enabled) return

    const manager = webSocketManager.current

    // Connection status handler
    const handleConnectionStatus = (connected: boolean) => {
      setIsConnected(connected)
      setConnectionState(connected ? 'connected' : 'disconnected')
    }

    // Presence change handler
    const handlePresenceChange = (changedItemId: string, users: UserPresence[]) => {
      if (changedItemId === itemId) {
        setActiveUsers(users)
        onPresenceUpdated?.(users)
      }
    }

    // Collaboration session handler
    const handleCollaborationStarted = (session: CollaborationSession) => {
      if (session.itemId === itemId) {
        setCollaborationSession(session)
      }
    }

    const handleCollaborationEnded = (sessionId: string) => {
      if (collaborationSession?.id === sessionId) {
        setCollaborationSession(null)
      }
    }

    // Register event handlers
    manager.on('connection_status_changed', handleConnectionStatus)
    manager.on('presence_changed', handlePresenceChange)
    manager.on('collaboration_started', handleCollaborationStarted)
    manager.on('collaboration_ended', handleCollaborationEnded)

    // Set initial connection state
    setIsConnected(manager.isConnected())

    handlersSetup.current = true

    return () => {
      manager.off('connection_status_changed')
      manager.off('presence_changed')
      manager.off('collaboration_started')
      manager.off('collaboration_ended')
      handlersSetup.current = false
    }
  }, [enabled, itemId, collaborationSession?.id, onPresenceUpdated])

  // Subscribe to content updates
  useEffect(() => {
    if (!enabled || !itemId || !isConnected) return

    const manager = webSocketManager.current
    const ids = manager.subscribeToItem(itemId, {
      includePresence,
      includeCollaboration
    })

    setSubscriptionIds(ids)

    // Get initial state
    const users = manager.getActiveUsers(itemId)
    setActiveUsers(users)

    const session = manager.getCollaborationSession(itemId)
    setCollaborationSession(session || null)

    return () => {
      manager.unsubscribeFromItem(itemId)
      setSubscriptionIds([])
    }
  }, [enabled, itemId, isConnected, includePresence, includeCollaboration])

  // Callback functions
  const updatePresence = useCallback((status: 'active' | 'idle' | 'away') => {
    if (!enabled || !itemId) return
    webSocketManager.current.updatePresence(itemId, status)
  }, [enabled, itemId])

  const sendCursorPosition = useCallback((position: { line: number; column: number }) => {
    if (!enabled || !itemId) return
    webSocketManager.current.sendCursorPosition(itemId, position)
  }, [enabled, itemId])

  const sendTextSelection = useCallback((selection: { start: number; end: number; text: string }) => {
    if (!enabled || !itemId) return
    webSocketManager.current.sendTextSelection(itemId, selection)
  }, [enabled, itemId])

  const connect = useCallback(async () => {
    if (!enabled) return
    await webSocketManager.current.connect()
  }, [enabled])

  const disconnect = useCallback(() => {
    webSocketManager.current.disconnect()
  }, [])

  return {
    isConnected,
    connectionState,
    activeUsers,
    collaborationSession,
    subscriptionIds,
    updatePresence,
    sendCursorPosition,
    sendTextSelection,
    connect,
    disconnect
  }
}

// ============================================================================
// WebSocket Connection Status Hook
// ============================================================================

export interface UseWebSocketConnectionReturn {
  isConnected: boolean
  connectionState: WebSocketConnectionState
  connectionStats: unknown
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
}

/**
 * Hook for WebSocket connection management
 * Requirements: 9.5
 */
export function useWebSocketConnection(): UseWebSocketConnectionReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('disconnected')
  const [connectionStats, setConnectionStats] = useState<WebSocketMetrics | null>(null)

  const webSocketManager = useRef(getWebSocketManager())

  useEffect(() => {
    const manager = webSocketManager.current

    const handleConnectionStatus = (connected: boolean) => {
      setIsConnected(connected)
      setConnectionState(connected ? 'connected' : 'disconnected')
      
      // Update stats when connection changes
      const stats = manager.getConnectionStats()
      setConnectionStats(stats as unknown as WebSocketMetrics)
    }

    manager.on('connection_status_changed', handleConnectionStatus)

    // Set initial state
    setIsConnected(manager.isConnected())
    const initialStats = manager.getConnectionStats()
    setConnectionStats(initialStats as unknown as WebSocketMetrics)

    return () => {
      manager.off('connection_status_changed')
    }
  }, [])

  const connect = useCallback(async () => {
    await webSocketManager.current.connect()
  }, [])

  const disconnect = useCallback(() => {
    webSocketManager.current.disconnect()
  }, [])

  const reconnect = useCallback(async () => {
    webSocketManager.current.disconnect()
    await webSocketManager.current.connect()
  }, [])

  return {
    isConnected,
    connectionState,
    connectionStats,
    connect,
    disconnect,
    reconnect
  }
}

// ============================================================================
// Presence Tracking Hook
// ============================================================================

export interface UsePresenceTrackingOptions {
  itemId: string
  enabled?: boolean
  updateInterval?: number
  autoUpdatePresence?: boolean
}

export interface UsePresenceTrackingReturn {
  activeUsers: UserPresence[]
  currentUserStatus: 'active' | 'idle' | 'away'
  updatePresence: (status: 'active' | 'idle' | 'away') => void
  isTracking: boolean
}

/**
 * Hook for presence tracking and management
 * Requirements: 9.3
 */
export function usePresenceTracking(options: UsePresenceTrackingOptions): UsePresenceTrackingReturn {
  const {
    itemId,
    enabled = true,
    updateInterval = 30000, // 30 seconds
    autoUpdatePresence = true
  } = options

  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([])
  const [currentUserStatus, setCurrentUserStatus] = useState<'active' | 'idle' | 'away'>('active')
  const [isTracking, setIsTracking] = useState(false)

  const webSocketManager = useRef(getWebSocketManager())
  const lastActivity = useRef(Date.now())
  const presenceTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  // Track user activity
  useEffect(() => {
    if (!enabled || !autoUpdatePresence) return

    const updateActivity = () => {
      lastActivity.current = Date.now()
      if (currentUserStatus !== 'active') {
        setCurrentUserStatus('active')
        webSocketManager.current.updatePresence(itemId, 'active')
      }
    }

    // Listen for user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [enabled, autoUpdatePresence, itemId, currentUserStatus])

  // Auto-update presence based on activity
  useEffect(() => {
    if (!enabled || !autoUpdatePresence) return

    presenceTimer.current = setInterval(() => {
      const now = Date.now()
      const timeSinceActivity = now - lastActivity.current

      let newStatus: 'active' | 'idle' | 'away' = 'active'

      if (timeSinceActivity > 300000) { // 5 minutes
        newStatus = 'away'
      } else if (timeSinceActivity > 60000) { // 1 minute
        newStatus = 'idle'
      }

      if (newStatus !== currentUserStatus) {
        setCurrentUserStatus(newStatus)
        webSocketManager.current.updatePresence(itemId, newStatus)
      }
    }, updateInterval)

    return () => {
      if (presenceTimer.current) {
        clearInterval(presenceTimer.current)
      }
    }
  }, [enabled, autoUpdatePresence, itemId, currentUserStatus, updateInterval])

  // Subscribe to presence updates
  useEffect(() => {
    if (!enabled || !itemId) return

    const manager = webSocketManager.current

    const handlePresenceChange = (changedItemId: string, users: UserPresence[]) => {
      if (changedItemId === itemId) {
        setActiveUsers(users)
      }
    }

    manager.on('presence_changed', handlePresenceChange)
    setIsTracking(true)

    // Get initial users
    const users = manager.getActiveUsers(itemId)
    setActiveUsers(users)

    return () => {
      manager.off('presence_changed')
      setIsTracking(false)
    }
  }, [enabled, itemId])

  const updatePresence = useCallback((status: 'active' | 'idle' | 'away') => {
    if (!enabled || !itemId) return
    
    setCurrentUserStatus(status)
    webSocketManager.current.updatePresence(itemId, status)
    lastActivity.current = Date.now()
  }, [enabled, itemId])

  return {
    activeUsers,
    currentUserStatus,
    updatePresence,
    isTracking
  }
}

// ============================================================================
// Collaboration Hook
// ============================================================================

export interface UseCollaborationOptions {
  itemId: string
  enabled?: boolean
  enableCursorTracking?: boolean
  enableTextSelection?: boolean
}

export interface UseCollaborationReturn {
  session: CollaborationSession | null
  participants: UserPresence[]
  sendCursorPosition: (position: { line: number; column: number }) => void
  sendTextSelection: (selection: { start: number; end: number; text: string }) => void
  isCollaborating: boolean
}

/**
 * Hook for real-time collaboration features
 * Requirements: 9.3
 */
export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const {
    itemId,
    enabled = true,
    enableCursorTracking = true,
    enableTextSelection = true
  } = options

  const [session, setSession] = useState<CollaborationSession | null>(null)
  const [participants, setParticipants] = useState<UserPresence[]>([])
  const [isCollaborating, setIsCollaborating] = useState(false)

  const webSocketManager = useRef(getWebSocketManager())

  useEffect(() => {
    if (!enabled || !itemId) return

    const manager = webSocketManager.current

    const handleCollaborationStarted = (newSession: CollaborationSession) => {
      if (newSession.itemId === itemId) {
        setSession(newSession)
        setParticipants(Array.from(newSession.participants.values()))
        setIsCollaborating(true)
      }
    }

    const handleCollaborationEnded = (sessionId: string) => {
      if (session?.id === sessionId) {
        setSession(null)
        setParticipants([])
        setIsCollaborating(false)
      }
    }

    manager.on('collaboration_started', handleCollaborationStarted)
    manager.on('collaboration_ended', handleCollaborationEnded)

    // Get initial session
    const existingSession = manager.getCollaborationSession(itemId)
    if (existingSession) {
      setSession(existingSession)
      setParticipants(Array.from(existingSession.participants.values()))
      setIsCollaborating(true)
    }

    return () => {
      manager.off('collaboration_started')
      manager.off('collaboration_ended')
    }
  }, [enabled, itemId, session?.id])

  const sendCursorPosition = useCallback((position: { line: number; column: number }) => {
    if (!enabled || !itemId || !enableCursorTracking) return
    webSocketManager.current.sendCursorPosition(itemId, position)
  }, [enabled, itemId, enableCursorTracking])

  const sendTextSelection = useCallback((selection: { start: number; end: number; text: string }) => {
    if (!enabled || !itemId || !enableTextSelection) return
    webSocketManager.current.sendTextSelection(itemId, selection)
  }, [enabled, itemId, enableTextSelection])

  return {
    session,
    participants,
    sendCursorPosition,
    sendTextSelection,
    isCollaborating
  }
}

// ============================================================================
// Content Sync Hook with Optimistic Updates
// ============================================================================

export interface UseContentSyncOptions {
  itemId: string
  enabled?: boolean
  enableOptimisticUpdates?: boolean
  conflictResolutionStrategy?: 'local_wins' | 'remote_wins' | 'merge' | 'manual'
}

export interface UseContentSyncReturn {
  content: ContentItem | null
  isLoading: boolean
  hasConflicts: boolean
  lastSync: Date | null
  sync: () => Promise<void>
  resolveConflicts: (strategy: 'local_wins' | 'remote_wins' | 'merge') => Promise<void>
}

/**
 * Hook for content synchronization with conflict resolution
 * Requirements: 9.2, 9.4
 */
export function useContentSync(options: UseContentSyncOptions): UseContentSyncReturn {
  const {
    itemId,
    enabled = true,
    // enableOptimisticUpdates and conflictResolutionStrategy reserved for future implementation
  } = options

  const [content, setContent] = useState<ContentItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasConflicts, setHasConflicts] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const webSocketManager = useRef(getWebSocketManager())

  const sync = useCallback(async () => {
    if (!enabled || !itemId) return

    setIsLoading(true)
    try {
      const updatedContent = await contentServiceClient.getContentItem(itemId)
      setContent(updatedContent)
      setLastSync(new Date())
    } catch (error) {
      console.error('Failed to sync content:', error)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, itemId])

  // Handle content changes from WebSocket
  useEffect(() => {
    if (!enabled || !itemId) return

    const manager = webSocketManager.current

    const handleConflictResolved = (resolution: { itemId: string }) => {
      if (resolution.itemId === itemId) {
        setHasConflicts(false)
        // Refresh content after conflict resolution
        sync()
      }
    }

    manager.on('conflict_resolved', handleConflictResolved)

    return () => {
      manager.off('conflict_resolved')
    }
  }, [enabled, itemId, sync])

  const resolveConflicts = useCallback(async (strategy: 'local_wins' | 'remote_wins' | 'merge') => {
    if (!enabled || !itemId || !hasConflicts) return

    // This would integrate with the conflict resolution system
    // For now, just sync the content regardless of strategy
    console.log('Resolving conflicts with strategy:', strategy)
    await sync()
    setHasConflicts(false)
  }, [enabled, itemId, hasConflicts, sync])

  // Initial sync
  useEffect(() => {
    if (enabled && itemId) {
      sync()
    }
  }, [enabled, itemId, sync])

  return {
    content,
    isLoading,
    hasConflicts,
    lastSync,
    sync,
    resolveConflicts
  }
}