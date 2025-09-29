import { Redis } from 'ioredis'
import {
  UserActivityPattern,
  NotificationPreferences,
  OptimalTiming,
  NotificationType,
} from '../types/notification.js'

export class TimingOptimizer {
  private redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
  }

  async calculateOptimalTiming(
    userId: string,
    activityPattern: UserActivityPattern,
    preferences: NotificationPreferences,
    notificationType: NotificationType,
  ): Promise<OptimalTiming> {
    // Get user's historical engagement data
    const engagementHistory = await this.getUserEngagementHistory(userId)

    // Calculate base optimal time based on activity pattern
    const baseOptimalTime = this.calculateBaseOptimalTime(activityPattern, preferences)

    // Adjust based on notification type
    const typeAdjustedTime = this.adjustForNotificationType(
      baseOptimalTime,
      notificationType,
      activityPattern,
    )

    // Apply machine learning insights from engagement history
    const mlOptimizedTime = await this.applyMLOptimization(
      typeAdjustedTime,
      engagementHistory,
      activityPattern,
    )

    // Ensure timing respects quiet hours
    const finalTime = this.respectQuietHours(mlOptimizedTime, preferences)

    // Generate alternative times
    const alternativeTimes = this.generateAlternativeTimes(finalTime, activityPattern, preferences)

    // Calculate confidence score
    const confidence = this.calculateConfidence(engagementHistory, activityPattern, finalTime)

    return {
      recommendedTime: finalTime,
      confidence,
      reasoning: this.generateReasoning(finalTime, activityPattern, notificationType),
      alternativeTimes,
    }
  }

  async updateTimingData(userId: string, deliveryTime: Date, wasEngaged: boolean): Promise<void> {
    const hour = deliveryTime.getHours()
    const dayOfWeek = deliveryTime.getDay()

    // Update engagement history
    const historyKey = `timing_history:${userId}`
    const dataPoint = {
      timestamp: deliveryTime.toISOString(),
      hour,
      dayOfWeek,
      engaged: wasEngaged,
    }

    // Store in Redis list (keep last 1000 data points)
    await this.redis.lpush(historyKey, JSON.stringify(dataPoint))
    await this.redis.ltrim(historyKey, 0, 999)
    await this.redis.expire(historyKey, 90 * 24 * 60 * 60) // 90 days TTL

    // Update hourly engagement rates
    const hourlyKey = `hourly_engagement:${userId}`
    const hourlyData = await this.redis.hgetall(hourlyKey)

    const currentHourData =
      hourlyData && hourlyData[hour.toString()]
        ? JSON.parse(hourlyData[hour.toString()])
        : { total: 0, engaged: 0 }

    currentHourData.total += 1
    if (wasEngaged) currentHourData.engaged += 1

    await this.redis.hset(hourlyKey, hour.toString(), JSON.stringify(currentHourData))
    await this.redis.expire(hourlyKey, 90 * 24 * 60 * 60)
  }

  private calculateBaseOptimalTime(
    activityPattern: UserActivityPattern,
    preferences: NotificationPreferences,
  ): Date {
    const now = new Date()
    const userTimezone = activityPattern.timezone || 'UTC'

    // Find the next peak hour
    const currentHour = now.getHours()
    let nextPeakHour = activityPattern.peakHours.find((hour) => hour > currentHour)

    if (!nextPeakHour) {
      // If no peak hour today, use first peak hour tomorrow
      nextPeakHour = activityPattern.peakHours[0]
      now.setDate(now.getDate() + 1)
    }

    // Set the optimal time
    const optimalTime = new Date(now)
    optimalTime.setHours(nextPeakHour, 0, 0, 0)

    return optimalTime
  }

  private adjustForNotificationType(
    baseTime: Date,
    type: NotificationType,
    activityPattern: UserActivityPattern,
  ): Date {
    const adjustedTime = new Date(baseTime)

    switch (type) {
      case NotificationType.STUDY_REMINDER:
        // Study reminders work best in the morning or early evening
        const hour = adjustedTime.getHours()
        if (hour < 8) {
          adjustedTime.setHours(8) // Not too early
        } else if (hour > 21) {
          adjustedTime.setHours(19) // Not too late
        }
        break

      case NotificationType.STREAK_REMINDER:
        // Streak reminders should be sent when user typically studies
        // If it's late in the day and they haven't studied, send urgently
        const currentHour = new Date().getHours()
        if (currentHour > 20) {
          adjustedTime.setTime(Date.now() + 30 * 60 * 1000) // 30 minutes from now
        }
        break

      case NotificationType.ACHIEVEMENT_UNLOCKED:
        // Achievements should be delivered immediately for maximum impact
        adjustedTime.setTime(Date.now() + 2 * 60 * 1000) // 2 minutes from now
        break

      case NotificationType.FRIEND_CHALLENGE:
        // Social notifications work best during social hours
        if (adjustedTime.getHours() < 10) {
          adjustedTime.setHours(10)
        } else if (adjustedTime.getHours() > 22) {
          adjustedTime.setHours(20)
        }
        break
    }

    return adjustedTime
  }

  private async applyMLOptimization(
    baseTime: Date,
    engagementHistory: EngagementDataPoint[],
    activityPattern: UserActivityPattern,
  ): Promise<Date> {
    if (engagementHistory.length < 10) {
      // Not enough data for ML optimization
      return baseTime
    }

    // Calculate engagement rates by hour
    const hourlyEngagement = this.calculateHourlyEngagementRates(engagementHistory)

    // Find the hour with highest engagement rate around the base time
    const baseHour = baseTime.getHours()
    const candidateHours = [baseHour - 1, baseHour, baseHour + 1].filter(
      (hour) => hour >= 0 && hour <= 23,
    )

    let bestHour = baseHour
    let bestRate = hourlyEngagement[baseHour] || 0

    for (const hour of candidateHours) {
      const rate = hourlyEngagement[hour] || 0
      if (rate > bestRate) {
        bestRate = rate
        bestHour = hour
      }
    }

    // Apply the optimized hour
    const optimizedTime = new Date(baseTime)
    optimizedTime.setHours(bestHour)

    return optimizedTime
  }

  private respectQuietHours(time: Date, preferences: NotificationPreferences): Date {
    if (!preferences.quietHours.enabled) {
      return time
    }

    const hour = time.getHours()
    const startHour = parseInt(preferences.quietHours.startTime.split(':')[0])
    const endHour = parseInt(preferences.quietHours.endTime.split(':')[0])

    // Check if time falls within quiet hours
    let isQuietTime = false
    if (startHour > endHour) {
      // Quiet hours span midnight (e.g., 22:00 to 08:00)
      isQuietTime = hour >= startHour || hour < endHour
    } else {
      // Quiet hours within same day
      isQuietTime = hour >= startHour && hour < endHour
    }

    if (isQuietTime) {
      // Move to end of quiet hours
      const adjustedTime = new Date(time)
      adjustedTime.setHours(endHour, 0, 0, 0)

      // If that's in the past, move to next day
      if (adjustedTime <= new Date()) {
        adjustedTime.setDate(adjustedTime.getDate() + 1)
      }

      return adjustedTime
    }

    return time
  }

  private generateAlternativeTimes(
    optimalTime: Date,
    activityPattern: UserActivityPattern,
    preferences: NotificationPreferences,
  ): Date[] {
    const alternatives: Date[] = []

    // Generate alternatives based on peak hours
    for (const peakHour of activityPattern.peakHours) {
      if (peakHour !== optimalTime.getHours()) {
        const altTime = new Date(optimalTime)
        altTime.setHours(peakHour, 0, 0, 0)

        // Ensure it's in the future and respects quiet hours
        if (altTime > new Date()) {
          const respectedTime = this.respectQuietHours(altTime, preferences)
          alternatives.push(respectedTime)
        }
      }
    }

    // Sort by proximity to optimal time
    alternatives.sort(
      (a, b) =>
        Math.abs(a.getTime() - optimalTime.getTime()) -
        Math.abs(b.getTime() - optimalTime.getTime()),
    )

    return alternatives.slice(0, 3) // Return top 3 alternatives
  }

  private calculateConfidence(
    engagementHistory: EngagementDataPoint[],
    activityPattern: UserActivityPattern,
    recommendedTime: Date,
  ): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence based on data availability
    if (engagementHistory.length > 50) {
      confidence += 0.2
    } else if (engagementHistory.length > 20) {
      confidence += 0.1
    }

    // Increase confidence if recommended time aligns with peak hours
    const recommendedHour = recommendedTime.getHours()
    if (activityPattern.peakHours.includes(recommendedHour)) {
      confidence += 0.2
    }

    // Increase confidence based on engagement rate at this hour
    const hourlyRates = this.calculateHourlyEngagementRates(engagementHistory)
    const hourRate = hourlyRates[recommendedHour] || 0
    confidence += hourRate * 0.3

    return Math.min(confidence, 1.0)
  }

  private generateReasoning(
    recommendedTime: Date,
    activityPattern: UserActivityPattern,
    notificationType: NotificationType,
  ): string {
    const hour = recommendedTime.getHours()
    const isPeakHour = activityPattern.peakHours.includes(hour)

    let reasoning = `Recommended for ${recommendedTime.toLocaleTimeString()} `

    if (isPeakHour) {
      reasoning += 'during your peak activity hours'
    } else {
      reasoning += 'based on optimal timing for ' + notificationType.replace('_', ' ')
    }

    if (activityPattern.totalSessions > 10) {
      reasoning += ` (based on ${activityPattern.totalSessions} previous sessions)`
    }

    return reasoning
  }

  private async getUserEngagementHistory(userId: string): Promise<EngagementDataPoint[]> {
    const historyKey = `timing_history:${userId}`
    const rawData = await this.redis.lrange(historyKey, 0, -1)

    if (!rawData || !Array.isArray(rawData)) {
      return []
    }

    return rawData.map((data) => JSON.parse(data))
  }

  private calculateHourlyEngagementRates(history: EngagementDataPoint[]): Record<number, number> {
    const hourlyStats: Record<number, { total: number; engaged: number }> = {}

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { total: 0, engaged: 0 }
    }

    // Aggregate data
    for (const point of history) {
      hourlyStats[point.hour].total += 1
      if (point.engaged) {
        hourlyStats[point.hour].engaged += 1
      }
    }

    // Calculate rates
    const rates: Record<number, number> = {}
    for (let i = 0; i < 24; i++) {
      const stats = hourlyStats[i]
      rates[i] = stats.total > 0 ? stats.engaged / stats.total : 0
    }

    return rates
  }
}

interface EngagementDataPoint {
  timestamp: string
  hour: number
  dayOfWeek: number
  engaged: boolean
}
