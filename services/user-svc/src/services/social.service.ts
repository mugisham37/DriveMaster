import { eq, and, or, desc, sql, inArray, not } from 'drizzle-orm'

import { db } from '../db/connection'
import {
  users,
  friendships,
  userSessions,
  userAchievements,
  achievements,
  notifications,
} from '../db/schema'

export interface FriendRequest {
  id: string
  requesterId: string
  addresseeId: string
  requesterProfile: {
    id: string
    firstName: string | null
    lastName: string | null
    totalXP: number
    currentStreak: number
  }
  addresseeProfile: {
    id: string
    firstName: string | null
    lastName: string | null
    totalXP: number
    currentStreak: number
  }
  status: string
  createdAt: Date
}

export interface Friend {
  id: string
  firstName: string | null
  lastName: string | null
  totalXP: number
  currentStreak: number
  longestStreak: number
  lastActiveAt: Date | null
  isOnline: boolean
}

export interface LeaderboardEntry {
  userId: string
  firstName: string | null
  lastName: string | null
  totalXP: number
  currentStreak: number
  longestStreak: number
  rank: number
  weeklyXP?: number
  monthlyXP?: number
}

export interface UserSearchResult {
  id: string
  firstName: string | null
  lastName: string | null
  totalXP: number
  currentStreak: number
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked'
}

export interface ProgressShare {
  userId: string
  achievementId?: string
  xpGained?: number
  streakMilestone?: number
  customMessage?: string
  shareToSocial?: boolean
}

export interface SocialStats {
  friendsCount: number
  pendingRequestsCount: number
  globalRank: number
  friendsRank: number
  weeklyXP: number
  monthlyXP: number
  recentAchievements: Array<{
    id: string
    name: string
    completedAt: Date
  }>
}

export class SocialService {
  /**
   * Send a friend request
   */
  static async sendFriendRequest(requesterId: string, addresseeId: string): Promise<FriendRequest> {
    // Validate users exist and are not the same
    if (requesterId === addresseeId) {
      throw new Error('Cannot send friend request to yourself')
    }

    const [requester, addressee] = await Promise.all([
      db.select().from(users).where(eq(users.id, requesterId)).limit(1),
      db.select().from(users).where(eq(users.id, addresseeId)).limit(1),
    ])

    if (requester.length === 0 || addressee.length === 0) {
      throw new Error('User not found')
    }

    // Check if friendship already exists
    const existingFriendship = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addresseeId)),
          and(eq(friendships.requesterId, addresseeId), eq(friendships.addresseeId, requesterId)),
        ),
      )
      .limit(1)

    if (existingFriendship.length > 0) {
      const status = existingFriendship[0].status
      if (status === 'accepted') {
        throw new Error('Users are already friends')
      } else if (status === 'pending') {
        throw new Error('Friend request already pending')
      } else if (status === 'blocked') {
        throw new Error('Cannot send friend request')
      }
    }

    // Check addressee's privacy settings
    const addresseePreferences = addressee[0].learningPreferences
    if (addresseePreferences && !addresseePreferences.socialFeatures) {
      throw new Error('User has disabled social features')
    }

    // Create friend request
    const [friendship] = await db
      .insert(friendships)
      .values({
        requesterId,
        addresseeId,
        status: 'pending',
      })
      .returning()

    // Send notification to addressee
    await this.sendFriendRequestNotification(addresseeId, requester[0])

    return {
      id: friendship.id,
      requesterId: friendship.requesterId,
      addresseeId: friendship.addresseeId,
      requesterProfile: {
        id: requester[0].id,
        firstName: requester[0].firstName,
        lastName: requester[0].lastName,
        totalXP: requester[0].totalXP ?? 0,
        currentStreak: requester[0].currentStreak ?? 0,
      },
      addresseeProfile: {
        id: addressee[0].id,
        firstName: addressee[0].firstName,
        lastName: addressee[0].lastName,
        totalXP: addressee[0].totalXP ?? 0,
        currentStreak: addressee[0].currentStreak ?? 0,
      },
      status: friendship.status,
      createdAt: friendship.createdAt ?? new Date(),
    }
  }

  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await db
      .select()
      .from(friendships)
      .where(and(eq(friendships.id, friendshipId), eq(friendships.addresseeId, userId)))
      .limit(1)

    if (friendship.length === 0) {
      throw new Error('Friend request not found')
    }

    if (friendship[0].status !== 'pending') {
      throw new Error('Friend request is not pending')
    }

    await db
      .update(friendships)
      .set({
        status: 'accepted',
        updatedAt: new Date(),
      })
      .where(eq(friendships.id, friendshipId))

    // Send notification to requester
    const requester = await db
      .select()
      .from(users)
      .where(eq(users.id, friendship[0].requesterId))
      .limit(1)

    const accepter = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (requester.length > 0 && accepter.length > 0) {
      await this.sendFriendAcceptedNotification(friendship[0].requesterId, accepter[0])
    }
  }

  /**
   * Decline a friend request
   */
  static async declineFriendRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await db
      .select()
      .from(friendships)
      .where(and(eq(friendships.id, friendshipId), eq(friendships.addresseeId, userId)))
      .limit(1)

    if (friendship.length === 0) {
      throw new Error('Friend request not found')
    }

    if (friendship[0].status !== 'pending') {
      throw new Error('Friend request is not pending')
    }

    await db.delete(friendships).where(eq(friendships.id, friendshipId))
  }

  /**
   * Remove a friend
   */
  static async removeFriend(userId: string, friendId: string): Promise<void> {
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
            and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId)),
          ),
          eq(friendships.status, 'accepted'),
        ),
      )
      .limit(1)

    if (friendship.length === 0) {
      throw new Error('Friendship not found')
    }

    await db.delete(friendships).where(eq(friendships.id, friendship[0].id))
  }

  /**
   * Block a user
   */
  static async blockUser(userId: string, targetUserId: string): Promise<void> {
    if (userId === targetUserId) {
      throw new Error('Cannot block yourself')
    }

    // Remove existing friendship if any
    await db
      .delete(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, targetUserId)),
          and(eq(friendships.requesterId, targetUserId), eq(friendships.addresseeId, userId)),
        ),
      )

    // Create block relationship
    await db.insert(friendships).values({
      requesterId: userId,
      addresseeId: targetUserId,
      status: 'blocked',
    })
  }

  /**
   * Unblock a user
   */
  static async unblockUser(userId: string, targetUserId: string): Promise<void> {
    await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, targetUserId),
          eq(friendships.status, 'blocked'),
        ),
      )
  }

  /**
   * Get user's friends list
   */
  static async getFriends(userId: string): Promise<Friend[]> {
    const friendsQuery = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        totalXP: users.totalXP,
        currentStreak: users.currentStreak,
        longestStreak: users.longestStreak,
        lastActiveAt: users.lastActiveAt,
      })
      .from(friendships)
      .innerJoin(
        users,
        or(
          and(eq(friendships.requesterId, userId), eq(users.id, friendships.addresseeId)),
          and(eq(friendships.addresseeId, userId), eq(users.id, friendships.requesterId)),
        ),
      )
      .where(eq(friendships.status, 'accepted'))
      .orderBy(desc(users.lastActiveAt))

    return friendsQuery.map((friend) => ({
      ...friend,
      totalXP: friend.totalXP ?? 0,
      currentStreak: friend.currentStreak ?? 0,
      longestStreak: friend.longestStreak ?? 0,
      isOnline: friend.lastActiveAt
        ? new Date().getTime() - friend.lastActiveAt.getTime() < 5 * 60 * 1000 // 5 minutes
        : false,
    }))
  }

  /**
   * Get pending friend requests (sent and received)
   */
  static async getPendingRequests(userId: string): Promise<{
    sent: FriendRequest[]
    received: FriendRequest[]
  }> {
    const [sentRequests, receivedRequests] = await Promise.all([
      // Sent requests
      db
        .select({
          id: friendships.id,
          requesterId: friendships.requesterId,
          addresseeId: friendships.addresseeId,
          status: friendships.status,
          createdAt: friendships.createdAt,
          addresseeFirstName: users.firstName,
          addresseeLastName: users.lastName,
          addresseeTotalXP: users.totalXP,
          addresseeCurrentStreak: users.currentStreak,
        })
        .from(friendships)
        .innerJoin(users, eq(users.id, friendships.addresseeId))
        .where(and(eq(friendships.requesterId, userId), eq(friendships.status, 'pending'))),

      // Received requests
      db
        .select({
          id: friendships.id,
          requesterId: friendships.requesterId,
          addresseeId: friendships.addresseeId,
          status: friendships.status,
          createdAt: friendships.createdAt,
          requesterFirstName: users.firstName,
          requesterLastName: users.lastName,
          requesterTotalXP: users.totalXP,
          requesterCurrentStreak: users.currentStreak,
        })
        .from(friendships)
        .innerJoin(users, eq(users.id, friendships.requesterId))
        .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, 'pending'))),
    ])

    const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    const userProfile = currentUser[0]

    return {
      sent: sentRequests.map((req) => ({
        id: req.id,
        requesterId: req.requesterId,
        addresseeId: req.addresseeId,
        requesterProfile: {
          id: userProfile.id,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          totalXP: userProfile.totalXP ?? 0,
          currentStreak: userProfile.currentStreak ?? 0,
        },
        addresseeProfile: {
          id: req.addresseeId,
          firstName: req.addresseeFirstName,
          lastName: req.addresseeLastName,
          totalXP: req.addresseeTotalXP ?? 0,
          currentStreak: req.addresseeCurrentStreak ?? 0,
        },
        status: req.status,
        createdAt: req.createdAt ?? new Date(),
      })),
      received: receivedRequests.map((req) => ({
        id: req.id,
        requesterId: req.requesterId,
        addresseeId: req.addresseeId,
        requesterProfile: {
          id: req.requesterId,
          firstName: req.requesterFirstName,
          lastName: req.requesterLastName,
          totalXP: req.requesterTotalXP ?? 0,
          currentStreak: req.requesterCurrentStreak ?? 0,
        },
        addresseeProfile: {
          id: userProfile.id,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          totalXP: userProfile.totalXP ?? 0,
          currentStreak: userProfile.currentStreak ?? 0,
        },
        status: req.status,
        createdAt: req.createdAt ?? new Date(),
      })),
    }
  }

  /**
   * Generate leaderboard with privacy controls
   */
  static async getLeaderboard(
    userId: string,
    scope: 'global' | 'friends' = 'global',
    timeframe: 'all_time' | 'weekly' | 'monthly' = 'all_time',
    limit: number = 50,
  ): Promise<LeaderboardEntry[]> {
    // Build the base query based on scope
    let userIds: string[] = []

    if (scope === 'friends') {
      // Get user's friends
      const friendIds = await db
        .select({
          friendId: sql<string>`CASE 
            WHEN ${friendships.requesterId} = ${userId} THEN ${friendships.addresseeId}
            ELSE ${friendships.requesterId}
          END`,
        })
        .from(friendships)
        .where(
          and(
            or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
            eq(friendships.status, 'accepted'),
          ),
        )

      userIds = friendIds.map((f) => f.friendId)
      userIds.push(userId) // Include the user themselves
    }

    // Build the main query
    const baseQuery = db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        totalXP: users.totalXP,
        currentStreak: users.currentStreak,
        longestStreak: users.longestStreak,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          sql`${users.learningPreferences}->>'socialFeatures' = 'true' OR ${users.learningPreferences}->>'socialFeatures' IS NULL`,
          ...(scope === 'friends' ? [inArray(users.id, userIds)] : []),
        ),
      )
      .orderBy(desc(users.totalXP))
      .limit(limit)

    const leaderboardData = await baseQuery

    // Add weekly/monthly XP if needed
    if (timeframe !== 'all_time') {
      const timeCondition =
        timeframe === 'weekly'
          ? sql`${userSessions.startTime} >= NOW() - INTERVAL '7 days'`
          : sql`${userSessions.startTime} >= NOW() - INTERVAL '30 days'`

      const periodXP = await db
        .select({
          userId: userSessions.userId,
          periodXP: sql<number>`COALESCE(SUM(${userSessions.xpEarned}), 0)`,
        })
        .from(userSessions)
        .where(timeCondition)
        .groupBy(userSessions.userId)

      const xpMap = new Map(periodXP.map((p) => [p.userId, p.periodXP]))

      // Create typed interface for user with period XP
      interface UserWithPeriodXP {
        userId: string
        firstName: string | null
        lastName: string | null
        totalXP: number | null
        currentStreak: number | null
        longestStreak: number | null
        periodXP: number
      }

      const usersWithPeriodXP: UserWithPeriodXP[] = leaderboardData.map((user) => ({
        ...user,
        periodXP: xpMap.get(user.userId) ?? 0,
      }))

      // Sort by period XP
      usersWithPeriodXP.sort((a, b) => (b.periodXP ?? 0) - (a.periodXP ?? 0))

      return usersWithPeriodXP.map((user, index) => ({
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        totalXP: user.totalXP ?? 0,
        currentStreak: user.currentStreak ?? 0,
        longestStreak: user.longestStreak ?? 0,
        rank: index + 1,
        ...(timeframe === 'weekly' && { weeklyXP: user.periodXP }),
        ...(timeframe === 'monthly' && { monthlyXP: user.periodXP }),
      }))
    }

    return leaderboardData.map((user, index) => ({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      totalXP: user.totalXP ?? 0,
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      rank: index + 1,
    }))
  }

  /**
   * Search for users with privacy settings
   */
  static async searchUsers(
    searcherId: string,
    query: string,
    limit: number = 20,
  ): Promise<UserSearchResult[]> {
    const searchPattern = `%${query.toLowerCase()}%`

    const searchResults = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        totalXP: users.totalXP,
        currentStreak: users.currentStreak,
      })
      .from(users)
      .where(
        and(
          not(eq(users.id, searcherId)), // Exclude searcher
          eq(users.isActive, true),
          sql`${users.learningPreferences}->>'socialFeatures' = 'true' OR ${users.learningPreferences}->>'socialFeatures' IS NULL`,
          or(
            sql`LOWER(${users.firstName}) LIKE ${searchPattern}`,
            sql`LOWER(${users.lastName}) LIKE ${searchPattern}`,
            sql`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE ${searchPattern}`,
          ),
        ),
      )
      .limit(limit)

    // Get friendship status for each user
    const userIds = searchResults.map((u) => u.id)
    const friendshipStatuses = await db
      .select({
        userId: sql<string>`CASE 
          WHEN ${friendships.requesterId} = ${searcherId} THEN ${friendships.addresseeId}
          ELSE ${friendships.requesterId}
        END`,
        status: friendships.status,
        isRequester: sql<boolean>`${friendships.requesterId} = ${searcherId}`,
      })
      .from(friendships)
      .where(
        and(
          or(
            and(eq(friendships.requesterId, searcherId), inArray(friendships.addresseeId, userIds)),
            and(eq(friendships.addresseeId, searcherId), inArray(friendships.requesterId, userIds)),
          ),
        ),
      )

    const statusMap = new Map<string, { status: string; isRequester: boolean }>()
    friendshipStatuses.forEach((fs) => {
      statusMap.set(fs.userId, { status: fs.status, isRequester: fs.isRequester })
    })

    return searchResults.map((user) => {
      const friendship = statusMap.get(user.id)
      let friendshipStatus: UserSearchResult['friendshipStatus'] = 'none'

      if (friendship) {
        if (friendship.status === 'accepted') {
          friendshipStatus = 'friends'
        } else if (friendship.status === 'pending') {
          friendshipStatus = friendship.isRequester ? 'pending_sent' : 'pending_received'
        } else if (friendship.status === 'blocked') {
          friendshipStatus = 'blocked'
        }
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        totalXP: user.totalXP ?? 0,
        currentStreak: user.currentStreak ?? 0,
        friendshipStatus,
      }
    })
  }

  /**
   * Share progress with friends and social media
   */
  static async shareProgress(userId: string, shareData: ProgressShare): Promise<void> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (user.length === 0) {
      throw new Error('User not found')
    }

    let shareMessage = shareData.customMessage ?? ''

    // Generate share message based on achievement or milestone
    if (shareData.achievementId !== null && shareData.achievementId !== undefined) {
      const achievement = await db
        .select()
        .from(achievements)
        .where(eq(achievements.id, shareData.achievementId))
        .limit(1)

      if (achievement.length > 0) {
        shareMessage = `🎉 Just unlocked "${achievement[0].name}" achievement! ${shareMessage}`
      }
    } else if (
      shareData.xpGained !== null &&
      shareData.xpGained !== undefined &&
      shareData.xpGained > 0
    ) {
      shareMessage = `📈 Earned ${shareData.xpGained} XP today! Total: ${user[0].totalXP} XP ${shareMessage}`
    } else if (
      shareData.streakMilestone !== null &&
      shareData.streakMilestone !== undefined &&
      shareData.streakMilestone > 0
    ) {
      shareMessage = `🔥 ${shareData.streakMilestone} day learning streak! ${shareMessage}`
    }

    // Notify friends about the progress
    const friends = await this.getFriends(userId)
    const friendIds = friends.map((f) => f.id)

    if (friendIds.length > 0) {
      const notificationPromises = friendIds.map((friendId) =>
        db.insert(notifications).values({
          userId: friendId,
          type: 'social',
          title: `${user[0].firstName !== null && user[0].firstName !== undefined && user[0].firstName.length > 0 ? user[0].firstName : 'Friend'} shared progress`,
          body: shareMessage,
          data: {
            type: 'progress_share',
            fromUserId: userId,
            fromUserName: `${user[0].firstName ?? ''} ${user[0].lastName ?? ''}`.trim(),
            shareData,
          },
        }),
      )

      await Promise.all(notificationPromises)
    }

    // TODO: Implement social media sharing if shareToSocial is true
    // This would integrate with platforms like Facebook, Twitter, etc.
  }

  /**
   * Get social statistics for a user
   */
  static async getSocialStats(userId: string): Promise<SocialStats> {
    const [
      friendsCount,
      pendingRequestsCount,
      globalRank,
      recentAchievements,
      weeklyXP,
      monthlyXP,
    ] = await Promise.all([
      // Friends count
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(friendships)
        .where(
          and(
            or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
            eq(friendships.status, 'accepted'),
          ),
        )
        .then((result) => result[0]?.count ?? 0),

      // Pending requests count
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(friendships)
        .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, 'pending')))
        .then((result) => result[0]?.count ?? 0),

      // Global rank
      this.getUserGlobalRank(userId),

      // Recent achievements (last 7 days)
      db
        .select({
          id: achievements.id,
          name: achievements.name,
          completedAt: userAchievements.completedAt,
        })
        .from(userAchievements)
        .innerJoin(achievements, eq(achievements.id, userAchievements.achievementId))
        .where(
          and(
            eq(userAchievements.userId, userId),
            eq(userAchievements.isCompleted, true),
            sql`${userAchievements.completedAt} >= NOW() - INTERVAL '7 days'`,
          ),
        )
        .orderBy(desc(userAchievements.completedAt))
        .limit(5),

      // Weekly XP
      db
        .select({ xp: sql<number>`COALESCE(SUM(${userSessions.xpEarned}), 0)` })
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            sql`${userSessions.startTime} >= NOW() - INTERVAL '7 days'`,
          ),
        )
        .then((result) => result[0]?.xp ?? 0),

      // Monthly XP
      db
        .select({ xp: sql<number>`COALESCE(SUM(${userSessions.xpEarned}), 0)` })
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            sql`${userSessions.startTime} >= NOW() - INTERVAL '30 days'`,
          ),
        )
        .then((result) => result[0]?.xp ?? 0),
    ])

    const friendsRank = await this.getUserFriendsRank(userId)

    return {
      friendsCount,
      pendingRequestsCount,
      globalRank,
      friendsRank,
      weeklyXP,
      monthlyXP,
      recentAchievements: recentAchievements.map((a) => ({
        id: a.id,
        name: a.name,
        completedAt: a.completedAt ?? new Date(),
      })),
    }
  }

  /**
   * Get user's global rank
   */
  private static async getUserGlobalRank(userId: string): Promise<number> {
    const userXP = await db
      .select({ totalXP: users.totalXP })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userXP.length === 0) return 0

    const rank = await db
      .select({ count: sql<number>`COUNT(*) + 1` })
      .from(users)
      .where(
        and(
          sql`${users.totalXP} > ${userXP[0].totalXP ?? 0}`,
          eq(users.isActive, true),
          sql`${users.learningPreferences}->>'socialFeatures' = 'true' OR ${users.learningPreferences}->>'socialFeatures' IS NULL`,
        ),
      )

    return rank[0]?.count ?? 1
  }

  /**
   * Get user's rank among friends
   */
  private static async getUserFriendsRank(userId: string): Promise<number> {
    const friends = await this.getFriends(userId)
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (user.length === 0) return 0

    const userXP = user[0].totalXP ?? 0
    const friendsWithHigherXP = friends.filter((friend) => friend.totalXP > userXP)

    return friendsWithHigherXP.length + 1
  }

  /**
   * Send friend request notification
   */
  private static async sendFriendRequestNotification(
    userId: string,
    requester: typeof users.$inferSelect,
  ): Promise<void> {
    await db.insert(notifications).values({
      userId,
      type: 'social',
      title: 'New Friend Request',
      body: `${requester.firstName ?? 'Someone'} sent you a friend request`,
      data: {
        type: 'friend_request',
        fromUserId: requester.id,
        fromUserName: `${requester.firstName ?? ''} ${requester.lastName ?? ''}`.trim(),
      },
    })
  }

  /**
   * Send friend accepted notification
   */
  private static async sendFriendAcceptedNotification(
    userId: string,
    accepter: typeof users.$inferSelect,
  ): Promise<void> {
    await db.insert(notifications).values({
      userId,
      type: 'social',
      title: 'Friend Request Accepted',
      body: `${accepter.firstName ?? 'Someone'} accepted your friend request`,
      data: {
        type: 'friend_accepted',
        fromUserId: accepter.id,
        fromUserName: `${accepter.firstName ?? ''} ${accepter.lastName ?? ''}`.trim(),
      },
    })
  }
}
