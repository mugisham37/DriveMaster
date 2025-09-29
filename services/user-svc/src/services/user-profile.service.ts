import { eq, and, desc, sql } from 'drizzle-orm'
import { db, readDb } from '../db/connection'
import {
  users,
  knowledgeStates,
  learningEvents,
  userSessions,
  userAchievements,
  friendships,
  spacedRepetition,
  notifications,
  type CognitivePatterns,
  type LearningPreferences,
} from '../db/schema'

export interface CreateUserProfileRequest {
  email: string
  password: string
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  cognitivePatterns?: Partial<CognitivePatterns>
  learningPreferences?: Partial<LearningPreferences>
}

export interface UpdateProfileRequest {
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  cognitivePatterns?: Partial<CognitivePatterns>
  learningPreferences?: Partial<LearningPreferences>
}

export interface UserProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  cognitivePatterns?: CognitivePatterns
  learningPreferences?: LearningPreferences
  totalXP: number
  currentStreak: number
  longestStreak: number
  lastActiveAt?: Date
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProgressUpdate {
  conceptId: string
  isCorrect: boolean
  responseTime: number
  confidenceLevel?: number
  sessionId: string
}

export interface UserProgress {
  totalSessions: number
  totalQuestions: number
  correctAnswers: number
  averageAccuracy: number
  totalStudyTime: number // in minutes
  conceptsMastered: number
  currentStreak: number
  longestStreak: number
  totalXP: number
  recentAchievements: Array<{
    id: string
    name: string
    completedAt: Date
  }>
  weeklyProgress: Array<{
    date: string
    sessionsCompleted: number
    questionsAnswered: number
    accuracy: number
    studyTime: number
  }>
}

export interface CognitivePatternAnalysis {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  processingSpeed: number
  attentionSpan: number
  preferredSessionLength: number
  optimalTimeOfDay: string[]
  difficultyPreference: 'gradual' | 'challenging' | 'mixed'
  feedbackPreference: 'immediate' | 'delayed' | 'summary'
  confidence: number // 0-1 scale indicating confidence in the analysis
}

export interface DataDeletionRequest {
  userId: string
  reason: string
  requestedAt: Date
  scheduledFor?: Date
}

export class UserProfileService {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const [user] = await readDb.select().from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      dateOfBirth: user.dateOfBirth || undefined,
      cognitivePatterns: user.cognitivePatterns || undefined,
      learningPreferences: user.learningPreferences || undefined,
      totalXP: user.totalXP || 0,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      lastActiveAt: user.lastActiveAt || undefined,
      emailVerified: user.emailVerified || false,
      createdAt: user.createdAt!,
      updatedAt: user.updatedAt!,
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserProfile> {
    // Merge existing cognitive patterns and learning preferences with updates
    const [existingUser] = await readDb
      .select({
        cognitivePatterns: users.cognitivePatterns,
        learningPreferences: users.learningPreferences,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!existingUser) {
      throw new Error('User not found')
    }

    const mergedCognitivePatterns = updates.cognitivePatterns
      ? { ...existingUser.cognitivePatterns, ...updates.cognitivePatterns }
      : existingUser.cognitivePatterns

    const mergedLearningPreferences = updates.learningPreferences
      ? { ...existingUser.learningPreferences, ...updates.learningPreferences }
      : existingUser.learningPreferences

    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        cognitivePatterns: mergedCognitivePatterns,
        learningPreferences: mergedLearningPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName || undefined,
      lastName: updatedUser.lastName || undefined,
      dateOfBirth: updatedUser.dateOfBirth || undefined,
      cognitivePatterns: updatedUser.cognitivePatterns || undefined,
      learningPreferences: updatedUser.learningPreferences || undefined,
      totalXP: updatedUser.totalXP || 0,
      currentStreak: updatedUser.currentStreak || 0,
      longestStreak: updatedUser.longestStreak || 0,
      lastActiveAt: updatedUser.lastActiveAt || undefined,
      emailVerified: updatedUser.emailVerified || false,
      createdAt: updatedUser.createdAt!,
      updatedAt: updatedUser.updatedAt!,
    }
  }

  /**
   * Analyze and update cognitive patterns based on user behavior
   */
  static async analyzeCognitivePatterns(userId: string): Promise<CognitivePatternAnalysis> {
    // Get recent learning events for analysis
    const recentEvents = await readDb
      .select({
        responseTime: learningEvents.responseData,
        contextData: learningEvents.contextData,
        timestamp: learningEvents.timestamp,
        eventType: learningEvents.eventType,
      })
      .from(learningEvents)
      .where(
        and(
          eq(learningEvents.userId, userId),
          sql`${learningEvents.timestamp} >= NOW() - INTERVAL '30 days'`,
        ),
      )
      .orderBy(desc(learningEvents.timestamp))
      .limit(1000)

    // Get session data for pattern analysis
    const recentSessions = await readDb
      .select({
        duration: userSessions.duration,
        questionsAttempted: userSessions.questionsAttempted,
        questionsCorrect: userSessions.questionsCorrect,
        startTime: userSessions.startTime,
        deviceInfo: userSessions.deviceInfo,
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isCompleted, true),
          sql`${userSessions.startTime} >= NOW() - INTERVAL '30 days'`,
        ),
      )
      .orderBy(desc(userSessions.startTime))
      .limit(100)

    // Analyze processing speed (average response time)
    const responseTimes = recentEvents
      .map((event) => event.responseTime?.responseTime)
      .filter((time): time is number => typeof time === 'number' && time > 0)

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 5000 // Default 5 seconds

    // Normalize processing speed (faster = higher score)
    const processingSpeed = Math.max(0.1, Math.min(2.0, 10000 / averageResponseTime))

    // Analyze session patterns for attention span and preferred session length
    const sessionDurations = recentSessions
      .map((session) => session.duration)
      .filter((duration): duration is number => typeof duration === 'number' && duration > 0)

    const averageSessionDuration =
      sessionDurations.length > 0
        ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
        : 1200 // Default 20 minutes

    const attentionSpan = Math.round(averageSessionDuration / 60) // Convert to minutes
    const preferredSessionLength = Math.round(attentionSpan * 1.2) // Slightly longer than attention span

    // Analyze optimal time of day
    const timeOfDayPerformance = recentSessions.reduce(
      (acc, session) => {
        if (!session.startTime) return acc

        const hour = session.startTime.getHours()
        const accuracy =
          session.questionsAttempted > 0
            ? (session.questionsCorrect || 0) / session.questionsAttempted
            : 0

        let timeSlot: string
        if (hour >= 6 && hour < 12) timeSlot = 'morning'
        else if (hour >= 12 && hour < 18) timeSlot = 'afternoon'
        else if (hour >= 18 && hour < 22) timeSlot = 'evening'
        else timeSlot = 'night'

        if (!acc[timeSlot]) {
          acc[timeSlot] = { totalAccuracy: 0, sessionCount: 0 }
        }

        acc[timeSlot].totalAccuracy += accuracy
        acc[timeSlot].sessionCount += 1

        return acc
      },
      {} as Record<string, { totalAccuracy: number; sessionCount: number }>,
    )

    const optimalTimeOfDay = Object.entries(timeOfDayPerformance)
      .map(([time, data]) => ({
        time,
        averageAccuracy: data.sessionCount > 0 ? data.totalAccuracy / data.sessionCount : 0,
      }))
      .filter((item) => item.averageAccuracy > 0)
      .sort((a, b) => b.averageAccuracy - a.averageAccuracy)
      .slice(0, 2)
      .map((item) => item.time)

    // Analyze difficulty preference based on performance patterns
    const accuracyTrend = recentSessions
      .slice(0, 20)
      .map((session) =>
        session.questionsAttempted > 0
          ? (session.questionsCorrect || 0) / session.questionsAttempted
          : 0,
      )

    const averageAccuracy =
      accuracyTrend.length > 0
        ? accuracyTrend.reduce((sum, acc) => sum + acc, 0) / accuracyTrend.length
        : 0.5

    let difficultyPreference: 'gradual' | 'challenging' | 'mixed'
    if (averageAccuracy > 0.85) {
      difficultyPreference = 'challenging'
    } else if (averageAccuracy < 0.65) {
      difficultyPreference = 'gradual'
    } else {
      difficultyPreference = 'mixed'
    }

    // Determine learning style based on device usage and interaction patterns
    const deviceTypes = recentSessions
      .map((session) => session.deviceInfo?.deviceType)
      .filter(
        (type): type is 'mobile' | 'tablet' | 'desktop' =>
          typeof type === 'string' && ['mobile', 'tablet', 'desktop'].includes(type),
      )

    const mobileUsage = deviceTypes.filter((type) => type === 'mobile').length
    const desktopUsage = deviceTypes.filter((type) => type === 'desktop').length

    // Simple heuristic: mobile users tend to be more kinesthetic, desktop users more visual
    let learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
    if (mobileUsage > desktopUsage * 2) {
      learningStyle = 'kinesthetic'
    } else if (desktopUsage > mobileUsage * 2) {
      learningStyle = 'visual'
    } else {
      learningStyle = 'mixed'
    }

    // Determine feedback preference based on response patterns
    const feedbackPreference: 'immediate' | 'delayed' | 'summary' = 'immediate' // Default for now

    // Calculate confidence based on data availability
    const dataPoints = recentEvents.length + recentSessions.length
    const confidence = Math.min(1.0, dataPoints / 100) // Full confidence with 100+ data points

    const analysis: CognitivePatternAnalysis = {
      learningStyle,
      processingSpeed,
      attentionSpan,
      preferredSessionLength,
      optimalTimeOfDay: optimalTimeOfDay.length > 0 ? optimalTimeOfDay : ['morning'],
      difficultyPreference,
      feedbackPreference,
      confidence,
    }

    // Update user's cognitive patterns if confidence is high enough
    if (confidence > 0.3) {
      await this.updateCognitivePatterns(userId, analysis)
    }

    return analysis
  }

  /**
   * Update cognitive patterns based on analysis
   */
  static async updateCognitivePatterns(
    userId: string,
    analysis: CognitivePatternAnalysis,
  ): Promise<void> {
    const cognitivePatterns: CognitivePatterns = {
      learningStyle: analysis.learningStyle,
      processingSpeed: analysis.processingSpeed,
      attentionSpan: analysis.attentionSpan,
      preferredSessionLength: analysis.preferredSessionLength,
      optimalTimeOfDay: analysis.optimalTimeOfDay,
      difficultyPreference: analysis.difficultyPreference,
      feedbackPreference: analysis.feedbackPreference,
    }

    await db
      .update(users)
      .set({
        cognitivePatterns,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  }

  /**
   * Get comprehensive user progress analytics
   */
  static async getUserProgress(userId: string): Promise<UserProgress> {
    // Get basic user stats
    const [user] = await readDb
      .select({
        totalXP: users.totalXP,
        currentStreak: users.currentStreak,
        longestStreak: users.longestStreak,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      throw new Error('User not found')
    }

    // Get session statistics
    const sessionStats = await readDb
      .select({
        totalSessions: sql<number>`COUNT(*)`,
        totalQuestions: sql<number>`SUM(${userSessions.questionsAttempted})`,
        correctAnswers: sql<number>`SUM(${userSessions.questionsCorrect})`,
        totalStudyTime: sql<number>`SUM(${userSessions.duration})`,
      })
      .from(userSessions)
      .where(and(eq(userSessions.userId, userId), eq(userSessions.isCompleted, true)))

    const stats = sessionStats[0] || {
      totalSessions: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      totalStudyTime: 0,
    }

    // Calculate average accuracy
    const averageAccuracy =
      stats.totalQuestions > 0 ? (stats.correctAnswers / stats.totalQuestions) * 100 : 0

    // Get concepts mastered (mastery probability > 0.8)
    const masteredConcepts = await readDb
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(knowledgeStates)
      .where(
        and(eq(knowledgeStates.userId, userId), sql`${knowledgeStates.masteryProbability} > 0.8`),
      )

    const conceptsMastered = masteredConcepts[0]?.count || 0

    // Get recent achievements
    const recentAchievements = await readDb
      .select({
        id: userAchievements.id,
        name: sql<string>`achievements.name`,
        completedAt: userAchievements.completedAt,
      })
      .from(userAchievements)
      .leftJoin(sql`achievements`, sql`achievements.id = ${userAchievements.achievementId}`)
      .where(and(eq(userAchievements.userId, userId), eq(userAchievements.isCompleted, true)))
      .orderBy(desc(userAchievements.completedAt))
      .limit(5)

    // Get weekly progress (last 7 days)
    const weeklyProgress = await readDb
      .select({
        date: sql<string>`DATE(${userSessions.startTime})`,
        sessionsCompleted: sql<number>`COUNT(*)`,
        questionsAnswered: sql<number>`SUM(${userSessions.questionsAttempted})`,
        correctAnswers: sql<number>`SUM(${userSessions.questionsCorrect})`,
        studyTime: sql<number>`SUM(${userSessions.duration})`,
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isCompleted, true),
          sql`${userSessions.startTime} >= NOW() - INTERVAL '7 days'`,
        ),
      )
      .groupBy(sql`DATE(${userSessions.startTime})`)
      .orderBy(sql`DATE(${userSessions.startTime})`)

    const formattedWeeklyProgress = weeklyProgress.map((day) => ({
      date: day.date,
      sessionsCompleted: day.sessionsCompleted,
      questionsAnswered: day.questionsAnswered,
      accuracy: day.questionsAnswered > 0 ? (day.correctAnswers / day.questionsAnswered) * 100 : 0,
      studyTime: Math.round((day.studyTime || 0) / 60), // Convert to minutes
    }))

    return {
      totalSessions: stats.totalSessions,
      totalQuestions: stats.totalQuestions,
      correctAnswers: stats.correctAnswers,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      totalStudyTime: Math.round((stats.totalStudyTime || 0) / 60), // Convert to minutes
      conceptsMastered,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalXP: user.totalXP || 0,
      recentAchievements: recentAchievements
        .filter((achievement) => achievement.completedAt)
        .map((achievement) => ({
          id: achievement.id,
          name: achievement.name || 'Unknown Achievement',
          completedAt: achievement.completedAt!,
        })),
      weeklyProgress: formattedWeeklyProgress,
    }
  }

  /**
   * Update user progress after learning activity
   */
  static async updateProgress(userId: string, progressUpdate: ProgressUpdate): Promise<void> {
    const { conceptId, isCorrect, responseTime, confidenceLevel, sessionId } = progressUpdate

    // Update knowledge state (this would typically be handled by the adaptive learning service)
    // For now, we'll just update basic user stats

    if (isCorrect) {
      // Increment XP and potentially streak
      await db
        .update(users)
        .set({
          totalXP: sql`${users.totalXP} + 10`, // 10 XP per correct answer
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
    }

    // Record learning event for future analysis
    await db.insert(learningEvents).values({
      userId,
      sessionId,
      eventType: 'question_answered',
      conceptId,
      responseData: {
        isCorrect,
        responseTime,
        confidenceLevel: confidenceLevel || 0.5,
        hintsUsed: 0,
        attemptsCount: 1,
      },
      contextData: {
        deviceType: 'desktop', // This should come from the request
        sessionId,
        timeOfDay: 'morning', // This should be calculated from current time
        networkCondition: 'excellent',
      },
    })
  }

  /**
   * Schedule user data deletion for GDPR/CCPA compliance
   */
  static async scheduleDataDeletion(
    userId: string,
    reason: string,
    scheduledFor?: Date,
  ): Promise<DataDeletionRequest> {
    const deletionDate = scheduledFor || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

    // Mark user as inactive immediately
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    // In a real implementation, you would store this in a deletion_requests table
    // and have a background job process the deletions
    const deletionRequest: DataDeletionRequest = {
      userId,
      reason,
      requestedAt: new Date(),
      scheduledFor: deletionDate,
    }

    // TODO: Implement actual deletion scheduling system
    console.log('Data deletion scheduled:', deletionRequest)

    return deletionRequest
  }

  /**
   * Execute user data deletion (GDPR/CCPA compliance)
   */
  static async executeDataDeletion(userId: string): Promise<void> {
    // Delete user data in the correct order to respect foreign key constraints

    // Delete learning events
    await db.delete(learningEvents).where(eq(learningEvents.userId, userId))

    // Delete user sessions
    await db.delete(userSessions).where(eq(userSessions.userId, userId))

    // Delete knowledge states
    await db.delete(knowledgeStates).where(eq(knowledgeStates.userId, userId))

    // Delete user achievements
    await db.delete(userAchievements).where(eq(userAchievements.userId, userId))

    // Delete friendships (both sent and received)
    await db
      .delete(friendships)
      .where(sql`${friendships.requesterId} = ${userId} OR ${friendships.addresseeId} = ${userId}`)

    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId))
  }

  /**
   * Export user data for GDPR/CCPA compliance
   */
  static async exportUserData(userId: string): Promise<Record<string, any>> {
    const [user] = await readDb.select().from(users).where(eq(users.id, userId)).limit(1)

    if (!user) {
      throw new Error('User not found')
    }

    // Get all related data
    const [knowledgeStatesData, learningEventsData, userSessionsData, userAchievementsData] =
      await Promise.all([
        readDb.select().from(knowledgeStates).where(eq(knowledgeStates.userId, userId)),
        readDb.select().from(learningEvents).where(eq(learningEvents.userId, userId)),
        readDb.select().from(userSessions).where(eq(userSessions.userId, userId)),
        readDb.select().from(userAchievements).where(eq(userAchievements.userId, userId)),
      ])

    return {
      user,
      knowledgeStates: knowledgeStatesData,
      learningEvents: learningEventsData,
      userSessions: userSessionsData,
      userAchievements: userAchievementsData,
      exportedAt: new Date().toISOString(),
    }
  }
}
