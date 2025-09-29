import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { SocialService } from '../social.service'
import { db } from '../../db/connection'
import {
  users,
  friendships,
  notifications,
  userSessions,
  userAchievements,
  achievements,
} from '../../db/schema'
import { eq, and, or } from 'drizzle-orm'

// Mock the database connection
jest.mock('../../db/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

const mockDb = db as jest.Mocked<typeof db>

describe('SocialService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('sendFriendRequest', () => {
    const mockRequester = {
      id: 'requester-id',
      email: 'requester@test.com',
      firstName: 'John',
      lastName: 'Doe',
      totalXP: 100,
      currentStreak: 5,
      learningPreferences: { socialFeatures: true },
    }

    const mockAddressee = {
      id: 'addressee-id',
      email: 'addressee@test.com',
      firstName: 'Jane',
      lastName: 'Smith',
      totalXP: 200,
      currentStreak: 10,
      learningPreferences: { socialFeatures: true },
    }

    it('should successfully send a friend request', async () => {
      // Mock user lookups
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockRequester]),
          }),
        }),
      } as any)

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAddressee]),
          }),
        }),
      } as any)

      // Mock existing friendship check
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // No existing friendship
          }),
        }),
      } as any)

      // Mock friendship creation
      const mockFriendship = {
        id: 'friendship-id',
        requesterId: 'requester-id',
        addresseeId: 'addressee-id',
        status: 'pending',
        createdAt: new Date(),
      }

      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockFriendship]),
        }),
      } as any)

      // Mock notification creation
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      } as any)

      const result = await SocialService.sendFriendRequest('requester-id', 'addressee-id')

      expect(result).toEqual({
        id: 'friendship-id',
        requesterId: 'requester-id',
        addresseeId: 'addressee-id',
        requesterProfile: {
          id: 'requester-id',
          firstName: 'John',
          lastName: 'Doe',
          totalXP: 100,
          currentStreak: 5,
        },
        addresseeProfile: {
          id: 'addressee-id',
          firstName: 'Jane',
          lastName: 'Smith',
          totalXP: 200,
          currentStreak: 10,
        },
        status: 'pending',
        createdAt: mockFriendship.createdAt,
      })
    })

    it('should throw error when trying to send request to self', async () => {
      await expect(SocialService.sendFriendRequest('user-id', 'user-id')).rejects.toThrow(
        'Cannot send friend request to yourself',
      )
    })

    it('should throw error when user not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // User not found
          }),
        }),
      } as any)

      await expect(SocialService.sendFriendRequest('requester-id', 'addressee-id')).rejects.toThrow(
        'User not found',
      )
    })

    it('should throw error when friendship already exists', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockRequester]),
          }),
        }),
      } as any)

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAddressee]),
          }),
        }),
      } as any)

      // Mock existing friendship
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ status: 'accepted' }]),
          }),
        }),
      } as any)

      await expect(SocialService.sendFriendRequest('requester-id', 'addressee-id')).rejects.toThrow(
        'Users are already friends',
      )
    })

    it('should throw error when addressee has disabled social features', async () => {
      const addresseeWithDisabledSocial = {
        ...mockAddressee,
        learningPreferences: { socialFeatures: false },
      }

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockRequester]),
          }),
        }),
      } as any)

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([addresseeWithDisabledSocial]),
          }),
        }),
      } as any)

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any)

      await expect(SocialService.sendFriendRequest('requester-id', 'addressee-id')).rejects.toThrow(
        'User has disabled social features',
      )
    })
  })

  describe('acceptFriendRequest', () => {
    it('should successfully accept a friend request', async () => {
      const mockFriendship = {
        id: 'friendship-id',
        requesterId: 'requester-id',
        addresseeId: 'addressee-id',
        status: 'pending',
      }

      // Mock friendship lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockFriendship]),
          }),
        }),
      } as any)

      // Mock friendship update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      } as any)

      // Mock user lookups for notification
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'requester-id', firstName: 'John' }]),
          }),
        }),
      } as any)

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'addressee-id', firstName: 'Jane' }]),
          }),
        }),
      } as any)

      // Mock notification creation
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      } as any)

      await expect(
        SocialService.acceptFriendRequest('addressee-id', 'friendship-id'),
      ).resolves.not.toThrow()
    })

    it('should throw error when friend request not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any)

      await expect(
        SocialService.acceptFriendRequest('addressee-id', 'friendship-id'),
      ).rejects.toThrow('Friend request not found')
    })

    it('should throw error when request is not pending', async () => {
      const mockFriendship = {
        id: 'friendship-id',
        requesterId: 'requester-id',
        addresseeId: 'addressee-id',
        status: 'accepted',
      }

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockFriendship]),
          }),
        }),
      } as any)

      await expect(
        SocialService.acceptFriendRequest('addressee-id', 'friendship-id'),
      ).rejects.toThrow('Friend request is not pending')
    })
  })

  describe('getFriends', () => {
    it('should return list of friends with online status', async () => {
      const mockFriendsData = [
        {
          id: 'friend-1',
          firstName: 'Alice',
          lastName: 'Johnson',
          totalXP: 300,
          currentStreak: 7,
          longestStreak: 15,
          lastActiveAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago (online)
        },
        {
          id: 'friend-2',
          firstName: 'Bob',
          lastName: 'Wilson',
          totalXP: 150,
          currentStreak: 3,
          longestStreak: 8,
          lastActiveAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago (offline)
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockFriendsData),
            }),
          }),
        }),
      } as any)

      const result = await SocialService.getFriends('user-id')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'friend-1',
        firstName: 'Alice',
        lastName: 'Johnson',
        totalXP: 300,
        currentStreak: 7,
        longestStreak: 15,
        lastActiveAt: mockFriendsData[0].lastActiveAt,
        isOnline: true, // Within 5 minutes
      })
      expect(result[1]).toEqual({
        id: 'friend-2',
        firstName: 'Bob',
        lastName: 'Wilson',
        totalXP: 150,
        currentStreak: 3,
        longestStreak: 8,
        lastActiveAt: mockFriendsData[1].lastActiveAt,
        isOnline: false, // More than 5 minutes
      })
    })

    it('should return empty array when user has no friends', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any)

      const result = await SocialService.getFriends('user-id')
      expect(result).toEqual([])
    })
  })

  describe('getLeaderboard', () => {
    it('should return global leaderboard', async () => {
      const mockLeaderboardData = [
        {
          userId: 'user-1',
          firstName: 'Top',
          lastName: 'Player',
          totalXP: 1000,
          currentStreak: 20,
          longestStreak: 25,
        },
        {
          userId: 'user-2',
          firstName: 'Second',
          lastName: 'Place',
          totalXP: 800,
          currentStreak: 15,
          longestStreak: 20,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockLeaderboardData),
            }),
          }),
        }),
      } as any)

      const result = await SocialService.getLeaderboard('user-id', 'global', 'all_time', 50)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        userId: 'user-1',
        firstName: 'Top',
        lastName: 'Player',
        totalXP: 1000,
        currentStreak: 20,
        longestStreak: 25,
        rank: 1,
      })
      expect(result[1]).toEqual({
        userId: 'user-2',
        firstName: 'Second',
        lastName: 'Place',
        totalXP: 800,
        currentStreak: 15,
        longestStreak: 20,
        rank: 2,
      })
    })

    it('should return friends leaderboard', async () => {
      // Mock friends lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ friendId: 'friend-1' }, { friendId: 'friend-2' }]),
        }),
      } as any)

      const mockFriendsLeaderboard = [
        {
          userId: 'friend-1',
          firstName: 'Friend',
          lastName: 'One',
          totalXP: 500,
          currentStreak: 10,
          longestStreak: 12,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockFriendsLeaderboard),
            }),
          }),
        }),
      } as any)

      const result = await SocialService.getLeaderboard('user-id', 'friends', 'all_time', 50)

      expect(result).toHaveLength(1)
      expect(result[0].rank).toBe(1)
    })
  })

  describe('searchUsers', () => {
    it('should return search results with friendship status', async () => {
      const mockSearchResults = [
        {
          id: 'search-user-1',
          firstName: 'Search',
          lastName: 'User',
          totalXP: 200,
          currentStreak: 5,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockSearchResults),
          }),
        }),
      } as any)

      // Mock friendship status lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      } as any)

      const result = await SocialService.searchUsers('searcher-id', 'search', 20)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'search-user-1',
        firstName: 'Search',
        lastName: 'User',
        totalXP: 200,
        currentStreak: 5,
        friendshipStatus: 'none',
      })
    })

    it('should show correct friendship status for pending requests', async () => {
      const mockSearchResults = [
        {
          id: 'search-user-1',
          firstName: 'Search',
          lastName: 'User',
          totalXP: 200,
          currentStreak: 5,
        },
      ]

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockSearchResults),
          }),
        }),
      } as any)

      // Mock friendship status - pending sent
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              userId: 'search-user-1',
              status: 'pending',
              isRequester: true,
            },
          ]),
        }),
      } as any)

      const result = await SocialService.searchUsers('searcher-id', 'search', 20)

      expect(result[0].friendshipStatus).toBe('pending_sent')
    })
  })

  describe('shareProgress', () => {
    it('should share achievement progress with friends', async () => {
      const mockUser = {
        id: 'user-id',
        firstName: 'John',
        lastName: 'Doe',
        totalXP: 500,
      }

      const mockAchievement = {
        id: 'achievement-id',
        name: 'First Victory',
      }

      const mockFriends = [{ id: 'friend-1' }, { id: 'friend-2' }]

      // Mock user lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any)

      // Mock achievement lookup
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockAchievement]),
          }),
        }),
      } as any)

      // Mock getFriends call
      jest.spyOn(SocialService, 'getFriends').mockResolvedValue(mockFriends as any)

      // Mock notification creation
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      } as any)

      await expect(
        SocialService.shareProgress('user-id', {
          userId: 'user-id',
          achievementId: 'achievement-id',
        }),
      ).resolves.not.toThrow()

      // Verify notifications were created for each friend
      expect(mockDb.insert).toHaveBeenCalledTimes(2)
    })

    it('should share XP progress with custom message', async () => {
      const mockUser = {
        id: 'user-id',
        firstName: 'John',
        lastName: 'Doe',
        totalXP: 500,
      }

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as any)

      jest.spyOn(SocialService, 'getFriends').mockResolvedValue([])

      await expect(
        SocialService.shareProgress('user-id', {
          userId: 'user-id',
          xpGained: 100,
          customMessage: 'Great study session!',
        }),
      ).resolves.not.toThrow()
    })
  })

  describe('getSocialStats', () => {
    it('should return comprehensive social statistics', async () => {
      // Mock all the database calls for social stats
      mockDb.select
        // Friends count
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 5 }]),
          }),
        } as any)
        // Pending requests count
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 2 }]),
          }),
        } as any)
        // Recent achievements
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue([
                    {
                      id: 'achievement-1',
                      name: 'First Win',
                      completedAt: new Date(),
                    },
                  ]),
                }),
              }),
            }),
          }),
        } as any)
        // Weekly XP
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ xp: 150 }]),
          }),
        } as any)
        // Monthly XP
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ xp: 600 }]),
          }),
        } as any)

      // Mock private methods
      jest.spyOn(SocialService as any, 'getUserGlobalRank').mockResolvedValue(10)
      jest.spyOn(SocialService as any, 'getUserFriendsRank').mockResolvedValue(3)

      const result = await SocialService.getSocialStats('user-id')

      expect(result).toEqual({
        friendsCount: 5,
        pendingRequestsCount: 2,
        globalRank: 10,
        friendsRank: 3,
        weeklyXP: 150,
        monthlyXP: 600,
        recentAchievements: [
          {
            id: 'achievement-1',
            name: 'First Win',
            completedAt: expect.any(Date),
          },
        ],
      })
    })
  })

  describe('blockUser', () => {
    it('should successfully block a user', async () => {
      // Mock existing friendship deletion
      mockDb.delete.mockReturnValueOnce({
        where: jest.fn().mockResolvedValue(undefined),
      } as any)

      // Mock block relationship creation
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockResolvedValue(undefined),
      } as any)

      await expect(SocialService.blockUser('user-id', 'target-id')).resolves.not.toThrow()
    })

    it('should throw error when trying to block self', async () => {
      await expect(SocialService.blockUser('user-id', 'user-id')).rejects.toThrow(
        'Cannot block yourself',
      )
    })
  })

  describe('removeFriend', () => {
    it('should successfully remove a friend', async () => {
      const mockFriendship = {
        id: 'friendship-id',
        requesterId: 'user-id',
        addresseeId: 'friend-id',
        status: 'accepted',
      }

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockFriendship]),
          }),
        }),
      } as any)

      mockDb.delete.mockReturnValueOnce({
        where: jest.fn().mockResolvedValue(undefined),
      } as any)

      await expect(SocialService.removeFriend('user-id', 'friend-id')).resolves.not.toThrow()
    })

    it('should throw error when friendship not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any)

      await expect(SocialService.removeFriend('user-id', 'friend-id')).rejects.toThrow(
        'Friendship not found',
      )
    })
  })
})
