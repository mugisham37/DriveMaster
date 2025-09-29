export interface UserGameProfile {
  userId: string
  totalXP: number
  level: number
  currentStreak: number
  longestStreak: number
  streakFreezes: number
  maxStreakFreezes: number
  lastActivityDate: Date
  achievements: Achievement[]
  badges: Badge[]
  challenges: Challenge[]
  statistics: UserStatistics
  preferences: GamificationPreferences
}

export interface Achievement {
  id: string
  name: string
  description: string
  category: AchievementCategory
  type: AchievementType
  criteria: AchievementCriteria
  reward: Reward
  unlockedAt?: Date
  progress: number
  maxProgress: number
  isUnlocked: boolean
  rarity: AchievementRarity
}

export interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string
  category: BadgeCategory
  earnedAt: Date
  level: number
  maxLevel: number
}

export interface Challenge {
  id: string
  name: string
  description: string
  type: ChallengeType
  status: ChallengeStatus
  participants: string[]
  creator: string
  startDate: Date
  endDate: Date
  criteria: ChallengeCriteria
  rewards: Reward[]
  leaderboard: ChallengeLeaderboard[]
  isPublic: boolean
}

export interface Reward {
  type: RewardType
  value: number
  description: string
  metadata?: Record<string, any>
}

export interface XPReward extends Reward {
  type: RewardType.XP
  multiplier: number
  baseAmount: number
  bonusAmount: number
  reason: string
}

export interface UserStatistics {
  totalQuestionsAnswered: number
  correctAnswers: number
  incorrectAnswers: number
  averageAccuracy: number
  totalStudyTime: number
  sessionsCompleted: number
  averageSessionLength: number
  topicsMastered: number
  perfectSessions: number
  comebackSessions: number
  weeklyGoalsMet: number
  monthlyGoalsMet: number
}

export interface GamificationPreferences {
  enableXPNotifications: boolean
  enableAchievementNotifications: boolean
  enableStreakReminders: boolean
  enableChallengeInvitations: boolean
  enableLeaderboardUpdates: boolean
  enableProgressCelebrations: boolean
  competitiveMode: boolean
  publicProfile: boolean
}

export interface StreakData {
  userId: string
  currentStreak: number
  longestStreak: number
  lastActivityDate: Date
  streakFreezes: number
  maxStreakFreezes: number
  streakType: StreakType
  milestones: StreakMilestone[]
}

export interface StreakMilestone {
  days: number
  reward: Reward
  achieved: boolean
  achievedAt?: Date
}

export interface Leaderboard {
  id: string
  name: string
  type: LeaderboardType
  period: LeaderboardPeriod
  entries: LeaderboardEntry[]
  lastUpdated: Date
  isActive: boolean
}

export interface LeaderboardEntry {
  userId: string
  userName: string
  avatarUrl?: string
  score: number
  rank: number
  change: number
  metadata?: Record<string, any>
}

export interface ChallengeLeaderboard {
  userId: string
  userName: string
  score: number
  rank: number
  progress: number
  completedAt?: Date
}

export interface ProgressVisualization {
  userId: string
  type: VisualizationType
  data: ProgressData
  milestones: Milestone[]
  projections: ProgressProjection[]
}

export interface ProgressData {
  current: number
  target: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  history: ProgressPoint[]
}

export interface ProgressPoint {
  date: Date
  value: number
  label?: string
}

export interface Milestone {
  id: string
  name: string
  description: string
  targetValue: number
  currentValue: number
  isAchieved: boolean
  achievedAt?: Date
  reward?: Reward
}

export interface ProgressProjection {
  date: Date
  projectedValue: number
  confidence: number
}

export interface CelebrationEvent {
  id: string
  userId: string
  type: CelebrationType
  title: string
  message: string
  data: Record<string, any>
  timestamp: Date
  isViewed: boolean
}

// Enums
export enum AchievementCategory {
  LEARNING = 'learning',
  STREAK = 'streak',
  ACCURACY = 'accuracy',
  SPEED = 'speed',
  SOCIAL = 'social',
  MILESTONE = 'milestone',
  SPECIAL = 'special',
}

export enum AchievementType {
  PROGRESS = 'progress',
  THRESHOLD = 'threshold',
  STREAK = 'streak',
  PERFECT = 'perfect',
  SOCIAL = 'social',
  TIME_BASED = 'time_based',
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum BadgeCategory {
  LEARNING = 'learning',
  STREAK = 'streak',
  SOCIAL = 'social',
  SPECIAL = 'special',
  SEASONAL = 'seasonal',
}

export enum ChallengeType {
  INDIVIDUAL = 'individual',
  FRIEND_DUEL = 'friend_duel',
  GROUP = 'group',
  GLOBAL = 'global',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export enum ChallengeStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum RewardType {
  XP = 'xp',
  BADGE = 'badge',
  ACHIEVEMENT = 'achievement',
  STREAK_FREEZE = 'streak_freeze',
  BONUS_TIME = 'bonus_time',
  COSMETIC = 'cosmetic',
}

export enum StreakType {
  DAILY_STUDY = 'daily_study',
  WEEKLY_GOAL = 'weekly_goal',
  PERFECT_SESSIONS = 'perfect_sessions',
  TOPIC_MASTERY = 'topic_mastery',
}

export enum LeaderboardType {
  XP = 'xp',
  STREAK = 'streak',
  ACCURACY = 'accuracy',
  QUESTIONS_ANSWERED = 'questions_answered',
  STUDY_TIME = 'study_time',
}

export enum LeaderboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

export enum VisualizationType {
  XP_PROGRESS = 'xp_progress',
  STREAK_CALENDAR = 'streak_calendar',
  ACCURACY_TREND = 'accuracy_trend',
  STUDY_TIME = 'study_time',
  TOPIC_MASTERY = 'topic_mastery',
}

export enum CelebrationType {
  LEVEL_UP = 'level_up',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  STREAK_MILESTONE = 'streak_milestone',
  CHALLENGE_WON = 'challenge_won',
  PERFECT_SESSION = 'perfect_session',
  COMEBACK_BONUS = 'comeback_bonus',
}

// Criteria interfaces
export interface AchievementCriteria {
  type: string
  target: number
  timeframe?: string
  conditions?: Record<string, any>
}

export interface ChallengeCriteria {
  type: string
  target: number
  metric: string
  timeLimit?: number
  conditions?: Record<string, any>
}
