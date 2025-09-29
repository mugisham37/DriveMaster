import { Redis } from 'ioredis'
import { nanoid } from 'nanoid'
import {
  Challenge,
  ChallengeType,
  ChallengeStatus,
  ChallengeCriteria,
  ChallengeLeaderboard,
  Reward,
  RewardType,
  CelebrationType,
} from '../types/gamification.js'

export class ChallengeSystem {
  private redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
  }

  async createChallenge(
    creatorId: string,
    type: ChallengeType,
    name: string,
    description: string,
    criteria: ChallengeCriteria,
    participants: string[] = [],
    duration: number = 7 * 24 * 60 * 60 * 1000, // 7 days default
    isPublic: boolean = false,
  ): Promise<Challenge> {
    const challenge: Challenge = {
      id: nanoid(),
      name,
      description,
      type,
      status: ChallengeStatus.PENDING,
      participants: [creatorId, ...participants],
      creator: creatorId,
      startDate: new Date(),
      endDate: new Date(Date.now() + duration),
      criteria,
      rewards: this.generateChallengeRewards(type, criteria, participants.length + 1),
      leaderboard: [],
      isPublic,
    }

    // Store challenge
    await this.storeChallenge(challenge)

    // Add to user's challenges
    for (const participantId of challenge.participants) {
      await this.addChallengeToUser(participantId, challenge.id)
    }

    // Send invitations to participants
    await this.sendChallengeInvitations(challenge)

    return challenge
  }

  async joinChallenge(userId: string, challengeId: string): Promise<boolean> {
    const challenge = await this.getChallenge(challengeId)
    if (!challenge || challenge.status !== ChallengeStatus.PENDING) {
      return false
    }

    // Check if user is already a participant
    if (challenge.participants.includes(userId)) {
      return false
    }

    // Add user to challenge
    challenge.participants.push(userId)
    await this.storeChallenge(challenge)
    await this.addChallengeToUser(userId, challengeId)

    return true
  }

  async startChallenge(challengeId: string): Promise<boolean> {
    const challenge = await this.getChallenge(challengeId)
    if (!challenge || challenge.status !== ChallengeStatus.PENDING) {
      return false
    }

    challenge.status = ChallengeStatus.ACTIVE
    challenge.startDate = new Date()

    // Initialize leaderboard
    challenge.leaderboard = challenge.participants.map((userId) => ({
      userId,
      userName: '', // Would be populated from user service
      score: 0,
      rank: 1,
      progress: 0,
    }))

    await this.storeChallenge(challenge)

    // Notify participants that challenge has started
    await this.notifyChallengeStart(challenge)

    return true
  }

  async updateChallengeProgress(
    challengeId: string,
    userId: string,
    activityData: ChallengeActivityData,
  ): Promise<void> {
    const challenge = await this.getChallenge(challengeId)
    if (!challenge || challenge.status !== ChallengeStatus.ACTIVE) {
      return
    }

    // Check if challenge has expired
    if (new Date() > challenge.endDate) {
      await this.endChallenge(challengeId)
      return
    }

    // Calculate progress based on criteria
    const progress = this.calculateChallengeProgress(challenge.criteria, activityData)

    // Update leaderboard
    const leaderboardEntry = challenge.leaderboard.find((entry) => entry.userId === userId)
    if (leaderboardEntry) {
      leaderboardEntry.score += progress
      leaderboardEntry.progress = this.calculateProgressPercentage(
        leaderboardEntry.score,
        challenge.criteria.target,
      )
    }

    // Sort leaderboard by score
    challenge.leaderboard.sort((a, b) => b.score - a.score)

    // Update ranks
    challenge.leaderboard.forEach((entry, index) => {
      entry.rank = index + 1
    })

    await this.storeChallenge(challenge)

    // Check if someone has completed the challenge
    const winner = challenge.leaderboard.find((entry) => entry.score >= challenge.criteria.target)
    if (winner) {
      await this.endChallenge(challengeId)
    }
  }

  async endChallenge(challengeId: string): Promise<void> {
    const challenge = await this.getChallenge(challengeId)
    if (!challenge || challenge.status === ChallengeStatus.COMPLETED) {
      return
    }

    challenge.status = ChallengeStatus.COMPLETED

    // Determine winners and award rewards
    const winners = this.determineWinners(challenge)
    await this.awardChallengeRewards(challenge, winners)

    // Create celebration events
    await this.createChallengeCelebrations(challenge, winners)

    // Update challenge statistics
    await this.updateChallengeStats(challenge)

    await this.storeChallenge(challenge)
  }

  async getChallengeLeaderboard(challengeId: string): Promise<ChallengeLeaderboard[]> {
    const challenge = await this.getChallenge(challengeId)
    return challenge ? challenge.leaderboard : []
  }

  async getUserChallenges(userId: string, status?: ChallengeStatus): Promise<Challenge[]> {
    const challengeIds = await this.redis.smembers(`user_challenges:${userId}`)
    const challenges: Challenge[] = []

    for (const challengeId of challengeIds) {
      const challenge = await this.getChallenge(challengeId)
      if (challenge && (!status || challenge.status === status)) {
        challenges.push(challenge)
      }
    }

    return challenges.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  }

  async getPublicChallenges(limit: number = 20): Promise<Challenge[]> {
    const challengeIds = await this.redis.smembers('public_challenges')
    const challenges: Challenge[] = []

    for (const challengeId of challengeIds) {
      const challenge = await this.getChallenge(challengeId)
      if (challenge && challenge.isPublic && challenge.status === ChallengeStatus.PENDING) {
        challenges.push(challenge)
      }
    }

    return challenges.sort((a, b) => b.startDate.getTime() - a.startDate.getTime()).slice(0, limit)
  }

  async createDailyChallenge(): Promise<Challenge> {
    const dailyChallenges = [
      {
        name: 'Speed Demon',
        description: 'Answer 20 questions in under 10 minutes',
        criteria: {
          type: 'speed_questions',
          target: 20,
          timeLimit: 10 * 60 * 1000,
          metric: 'questions',
        },
      },
      {
        name: 'Accuracy Master',
        description: 'Achieve 95% accuracy on 15 questions',
        criteria: {
          type: 'accuracy_challenge',
          target: 15,
          conditions: { minAccuracy: 0.95 },
          metric: 'questions',
        },
      },
      {
        name: 'Study Marathon',
        description: 'Study for 60 minutes today',
        criteria: { type: 'study_time', target: 60 * 60 * 1000, metric: 'time' },
      },
      {
        name: 'Perfect Session',
        description: 'Complete a perfect session (100% accuracy)',
        criteria: { type: 'perfect_session', target: 1, metric: 'sessions' },
      },
    ]

    const randomChallenge = dailyChallenges[Math.floor(Math.random() * dailyChallenges.length)]

    return this.createChallenge(
      'system',
      ChallengeType.DAILY,
      randomChallenge.name,
      randomChallenge.description,
      randomChallenge.criteria,
      [], // No specific participants for daily challenges
      24 * 60 * 60 * 1000, // 24 hours
      true, // Public
    )
  }

  private calculateChallengeProgress(
    criteria: ChallengeCriteria,
    activityData: ChallengeActivityData,
  ): number {
    switch (criteria.type) {
      case 'questions_answered':
        return activityData.questionsAnswered || 0
      case 'correct_answers':
        return activityData.correctAnswers || 0
      case 'study_time':
        return activityData.studyTime || 0
      case 'accuracy_challenge':
        if (
          activityData.accuracy &&
          activityData.accuracy >= (criteria.conditions?.minAccuracy || 0.9)
        ) {
          return activityData.questionsAnswered || 0
        }
        return 0
      case 'speed_questions':
        if (
          activityData.averageResponseTime &&
          activityData.averageResponseTime <= (criteria.timeLimit || 30000)
        ) {
          return activityData.questionsAnswered || 0
        }
        return 0
      case 'perfect_session':
        return activityData.isPerfectSession ? 1 : 0
      default:
        return 0
    }
  }

  private calculateProgressPercentage(current: number, target: number): number {
    return Math.min((current / target) * 100, 100)
  }

  private determineWinners(challenge: Challenge): string[] {
    const winners: string[] = []

    switch (challenge.type) {
      case ChallengeType.FRIEND_DUEL:
        // Winner is the one with highest score
        if (challenge.leaderboard.length > 0) {
          const topScore = challenge.leaderboard[0].score
          winners.push(
            ...challenge.leaderboard
              .filter((entry) => entry.score === topScore)
              .map((entry) => entry.userId),
          )
        }
        break

      case ChallengeType.GROUP:
      case ChallengeType.GLOBAL:
        // Top 3 winners
        winners.push(...challenge.leaderboard.slice(0, 3).map((entry) => entry.userId))
        break

      case ChallengeType.DAILY:
        // Everyone who completes the challenge wins
        winners.push(
          ...challenge.leaderboard
            .filter((entry) => entry.score >= challenge.criteria.target)
            .map((entry) => entry.userId),
        )
        break
    }

    return winners
  }

  private generateChallengeRewards(
    type: ChallengeType,
    criteria: ChallengeCriteria,
    participantCount: number,
  ): Reward[] {
    const baseXP = 100
    const rewards: Reward[] = []

    switch (type) {
      case ChallengeType.FRIEND_DUEL:
        rewards.push({
          type: RewardType.XP,
          value: baseXP * 2,
          description: `${baseXP * 2} XP for winning the duel`,
        })
        break

      case ChallengeType.GROUP:
        rewards.push(
          { type: RewardType.XP, value: baseXP * 3, description: `${baseXP * 3} XP for 1st place` },
          { type: RewardType.XP, value: baseXP * 2, description: `${baseXP * 2} XP for 2nd place` },
          { type: RewardType.XP, value: baseXP, description: `${baseXP} XP for 3rd place` },
        )
        break

      case ChallengeType.DAILY:
        rewards.push({
          type: RewardType.XP,
          value: baseXP,
          description: `${baseXP} XP for completing daily challenge`,
        })
        break

      default:
        rewards.push({
          type: RewardType.XP,
          value: baseXP,
          description: `${baseXP} XP reward`,
        })
    }

    return rewards
  }

  private async awardChallengeRewards(challenge: Challenge, winners: string[]): Promise<void> {
    for (let i = 0; i < winners.length && i < challenge.rewards.length; i++) {
      const winner = winners[i]
      const reward = challenge.rewards[i]

      // Award the reward (would integrate with XP system, etc.)
      await this.awardReward(winner, reward)

      // Record challenge win
      await this.recordChallengeWin(winner, challenge.id)
    }
  }

  private async awardReward(userId: string, reward: Reward): Promise<void> {
    switch (reward.type) {
      case RewardType.XP:
        // Would integrate with XP system
        break
      case RewardType.STREAK_FREEZE:
        // Would integrate with streak system
        break
      // Add other reward types as needed
    }
  }

  private async recordChallengeWin(userId: string, challengeId: string): Promise<void> {
    await this.redis.incr(`challenge_wins:${userId}`)
    await this.redis.lpush(
      `challenge_history:${userId}`,
      JSON.stringify({
        challengeId,
        result: 'won',
        timestamp: new Date().toISOString(),
      }),
    )
    await this.redis.ltrim(`challenge_history:${userId}`, 0, 99)
  }

  private async createChallengeCelebrations(
    challenge: Challenge,
    winners: string[],
  ): Promise<void> {
    for (const winner of winners) {
      const celebration = {
        id: `challenge_won_${winner}_${challenge.id}_${Date.now()}`,
        userId: winner,
        type: CelebrationType.CHALLENGE_WON,
        title: 'Challenge Victory!',
        message: `Congratulations! You won the "${challenge.name}" challenge!`,
        data: {
          challengeId: challenge.id,
          challengeName: challenge.name,
          challengeType: challenge.type,
          participantCount: challenge.participants.length,
        },
        timestamp: new Date(),
        isViewed: false,
      }

      await this.redis.lpush(`celebrations:${winner}`, JSON.stringify(celebration))
      await this.redis.ltrim(`celebrations:${winner}`, 0, 99)
      await this.redis.expire(`celebrations:${winner}`, 30 * 24 * 60 * 60)
    }
  }

  private async updateChallengeStats(challenge: Challenge): Promise<void> {
    const stats = {
      challengeId: challenge.id,
      type: challenge.type,
      participantCount: challenge.participants.length,
      completedAt: new Date().toISOString(),
      duration: challenge.endDate.getTime() - challenge.startDate.getTime(),
      winners: this.determineWinners(challenge),
    }

    await this.redis.lpush('challenge_stats', JSON.stringify(stats))
    await this.redis.ltrim('challenge_stats', 0, 9999) // Keep last 10k challenges
  }

  private async sendChallengeInvitations(challenge: Challenge): Promise<void> {
    // This would integrate with the notification system
    for (const participantId of challenge.participants) {
      if (participantId !== challenge.creator) {
        // Send invitation notification
        // await notificationService.schedulePersonalizedNotification(...)
      }
    }
  }

  private async notifyChallengeStart(challenge: Challenge): Promise<void> {
    // This would integrate with the notification system
    for (const participantId of challenge.participants) {
      // Send challenge start notification
      // await notificationService.schedulePersonalizedNotification(...)
    }
  }

  private async getChallenge(challengeId: string): Promise<Challenge | null> {
    const data = await this.redis.get(`challenge:${challengeId}`)
    if (!data) return null

    const challenge = JSON.parse(data)
    return {
      ...challenge,
      startDate: new Date(challenge.startDate),
      endDate: new Date(challenge.endDate),
    }
  }

  private async storeChallenge(challenge: Challenge): Promise<void> {
    await this.redis.setex(
      `challenge:${challenge.id}`,
      30 * 24 * 60 * 60, // 30 days TTL
      JSON.stringify(challenge),
    )

    // Add to public challenges if public
    if (challenge.isPublic) {
      await this.redis.sadd('public_challenges', challenge.id)
    }
  }

  private async addChallengeToUser(userId: string, challengeId: string): Promise<void> {
    await this.redis.sadd(`user_challenges:${userId}`, challengeId)
    await this.redis.expire(`user_challenges:${userId}`, 90 * 24 * 60 * 60) // 90 days TTL
  }
}

// Supporting interfaces
interface ChallengeActivityData {
  questionsAnswered?: number
  correctAnswers?: number
  studyTime?: number
  accuracy?: number
  averageResponseTime?: number
  isPerfectSession?: boolean
}
