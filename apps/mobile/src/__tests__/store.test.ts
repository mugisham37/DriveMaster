import { useAuthStore, useLearningStore, useOfflineStore } from '../store'
import { User, LearningSession } from '../types'

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('should login successfully', async () => {
    const { login } = useAuthStore.getState()

    await login('test@example.com', 'password123')

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user?.email).toBe('test@example.com')
    expect(state.tokens).toBeTruthy()
  })

  it('should logout successfully', () => {
    // Set initial authenticated state
    useAuthStore.setState({
      user: { id: '1', email: 'test@example.com', createdAt: '', updatedAt: '' },
      tokens: { accessToken: 'token', refreshToken: 'refresh', expiresAt: '' },
      isAuthenticated: true,
    })

    const { logout } = useAuthStore.getState()
    logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.tokens).toBeNull()
  })

  it('should update user profile', () => {
    const initialUser: User = {
      id: '1',
      email: 'test@example.com',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }

    useAuthStore.setState({ user: initialUser })

    const { updateUser } = useAuthStore.getState()
    updateUser({
      cognitivePatterns: {
        learningStyle: 'visual',
        processingSpeed: 0.8,
        attentionSpan: 30,
        preferredDifficulty: 0.6,
        motivationFactors: ['gamification', 'progress'],
      },
    })

    const state = useAuthStore.getState()
    expect(state.user?.cognitivePatterns?.learningStyle).toBe('visual')
    expect(state.user?.updatedAt).not.toBe('2024-01-01')
  })
})

describe('Learning Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLearningStore.setState({
      currentSession: null,
      questions: [],
      knowledgeStates: [],
      achievements: [],
      isLoading: false,
    })
  })

  it('should start a learning session', () => {
    const { startSession } = useLearningStore.getState()

    startSession('traffic-signs')

    const state = useLearningStore.getState()
    expect(state.currentSession).toBeTruthy()
    expect(state.currentSession?.category).toBe('traffic-signs')
    expect(state.currentSession?.isCompleted).toBe(false)
  })

  it('should end a learning session', () => {
    // Start a session first
    const { startSession, endSession } = useLearningStore.getState()
    startSession('road-rules')

    // End the session
    endSession()

    const state = useLearningStore.getState()
    expect(state.currentSession).toBeNull()
  })

  it('should answer a question correctly', () => {
    const { startSession, answerQuestion } = useLearningStore.getState()

    // Set up initial state
    useLearningStore.setState({
      questions: [
        {
          id: 'q1',
          title: 'Test Question',
          content: 'What is the correct answer?',
          category: 'traffic-signs',
          difficulty: 0.5,
          correctAnswer: 'A',
          version: 1,
        },
      ],
    })

    startSession('traffic-signs')
    answerQuestion('q1', 'A', 2000)

    const state = useLearningStore.getState()
    expect(state.currentSession?.questionsAnswered).toBe(1)
    expect(state.currentSession?.correctAnswers).toBe(1)
    expect(state.currentSession?.totalScore).toBe(10)
  })

  it('should answer a question incorrectly', () => {
    const { startSession, answerQuestion } = useLearningStore.getState()

    // Set up initial state
    useLearningStore.setState({
      questions: [
        {
          id: 'q1',
          title: 'Test Question',
          content: 'What is the correct answer?',
          category: 'traffic-signs',
          difficulty: 0.5,
          correctAnswer: 'A',
          version: 1,
        },
      ],
    })

    startSession('traffic-signs')
    answerQuestion('q1', 'B', 3000)

    const state = useLearningStore.getState()
    expect(state.currentSession?.questionsAnswered).toBe(1)
    expect(state.currentSession?.correctAnswers).toBe(0)
    expect(state.currentSession?.totalScore).toBe(0)
  })

  it('should update knowledge state', () => {
    const { updateKnowledgeState } = useLearningStore.getState()

    updateKnowledgeState('concept-1', 0.8)

    const state = useLearningStore.getState()
    expect(state.knowledgeStates).toHaveLength(1)
    expect(state.knowledgeStates[0].conceptId).toBe('concept-1')
    expect(state.knowledgeStates[0].masteryProbability).toBe(0.8)
  })
})

describe('Offline Store', () => {
  beforeEach(() => {
    // Reset store state before each test
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
  })

  it('should add offline action', () => {
    const { addAction } = useOfflineStore.getState()

    addAction({
      type: 'ANSWER_QUESTION',
      payload: { questionId: 'q1', answer: 'A' },
    })

    const state = useOfflineStore.getState()
    expect(state.pendingActions).toHaveLength(1)
    expect(state.pendingActions[0].type).toBe('ANSWER_QUESTION')
    expect(state.syncStatus.pendingUploads).toBe(1)
  })

  it('should remove offline action', () => {
    const { addAction, removeAction } = useOfflineStore.getState()

    // Add an action first
    addAction({
      type: 'ANSWER_QUESTION',
      payload: { questionId: 'q1', answer: 'A' },
    })

    const actionId = useOfflineStore.getState().pendingActions[0].id
    removeAction(actionId)

    const state = useOfflineStore.getState()
    expect(state.pendingActions).toHaveLength(0)
    expect(state.syncStatus.pendingUploads).toBe(0)
  })

  it('should update sync status', () => {
    const { updateSyncStatus } = useOfflineStore.getState()

    updateSyncStatus({
      syncInProgress: true,
      pendingDownloads: 5,
    })

    const state = useOfflineStore.getState()
    expect(state.syncStatus.syncInProgress).toBe(true)
    expect(state.syncStatus.pendingDownloads).toBe(5)
  })

  it('should set online status', () => {
    const { setOnlineStatus } = useOfflineStore.getState()

    setOnlineStatus(false)

    const state = useOfflineStore.getState()
    expect(state.isOnline).toBe(false)
  })

  it('should process pending actions when coming online', async () => {
    const { addAction, setOnlineStatus, processPendingActions } = useOfflineStore.getState()

    // Add some actions while offline
    useOfflineStore.setState({ isOnline: false })
    addAction({ type: 'ANSWER_QUESTION', payload: { questionId: 'q1' } })
    addAction({ type: 'UPDATE_PROFILE', payload: { name: 'Test' } })

    // Mock the processing
    const processSpy = jest.spyOn(useOfflineStore.getState(), 'processPendingActions')

    // Come back online
    setOnlineStatus(true)

    // Verify processing was triggered
    expect(processSpy).toHaveBeenCalled()
  })
})
