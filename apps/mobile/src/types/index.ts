// Core type definitions for DriveMaster mobile app

export interface User {
  id: string
  email: string
  cognitivePatterns?: CognitivePatterns
  learningPreferences?: LearningPreferences
  createdAt: string
  updatedAt: string
}

export interface CognitivePatterns {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  processingSpeed: number // 0-1 scale
  attentionSpan: number // minutes
  preferredDifficulty: number // 0-1 scale
  motivationFactors: string[]
}

export interface LearningPreferences {
  sessionLength: number // minutes
  dailyGoal: number // questions per day
  reminderTimes: string[] // HH:MM format
  enableNotifications: boolean
  preferredCategories: ContentCategory[]
}

export type ContentCategory =
  | 'traffic-signs'
  | 'road-rules'
  | 'safety-procedures'
  | 'situational-judgment'
  | 'vehicle-operations'

export interface Question {
  id: string
  title: string
  content: string
  category: ContentCategory
  difficulty: number
  options?: QuestionOption[]
  correctAnswer?: string
  explanation?: string
  mediaUrl?: string
  version: number
}

export interface QuestionOption {
  id: string
  text: string
  isCorrect: boolean
}

export interface UserResponse {
  questionId: string
  selectedAnswer: string
  isCorrect: boolean
  responseTime: number // milliseconds
  confidence: number // 0-1 scale
  timestamp: string
}

export interface LearningSession {
  id: string
  userId: string
  startTime: string
  endTime?: string
  questionsAnswered: number
  correctAnswers: number
  totalScore: number
  category?: ContentCategory
  isCompleted: boolean
}

export interface KnowledgeState {
  id: string
  userId: string
  conceptId: string
  masteryProbability: number
  lastUpdated: string
  reviewCount: number
  nextReviewDate: string
}

export interface SyncStatus {
  lastSyncTime: string
  pendingUploads: number
  pendingDownloads: number
  isOnline: boolean
  syncInProgress: boolean
}

export interface Achievement {
  id: string
  title: string
  description: string
  iconUrl: string
  unlockedAt?: string
  progress: number // 0-1 scale
  category: 'streak' | 'mastery' | 'social' | 'milestone'
}

export interface Friend {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  currentStreak: number
  totalXP: number
  isOnline: boolean
}

export interface LeaderboardEntry {
  userId: string
  displayName: string
  score: number
  rank: number
  change: number // position change from last period
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  Question: { questionId: string }
  Results: { sessionId: string }
  Profile: undefined
  Settings: undefined
  Friends: undefined
  Leaderboard: undefined
}

export type MainTabParamList = {
  Learn: undefined
  Progress: undefined
  Social: undefined
  Profile: undefined
}

// Offline sync types
export interface OfflineAction {
  id: string
  type: 'ANSWER_QUESTION' | 'UPDATE_PROFILE' | 'ADD_FRIEND' | 'SYNC_PROGRESS'
  payload: any
  timestamp: string
  retryCount: number
  maxRetries: number
}

export interface ConflictResolution {
  type: 'CLIENT_WINS' | 'SERVER_WINS' | 'MERGE' | 'MANUAL'
  clientData: any
  serverData: any
  resolvedData?: any
}
