import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { withErrorHandling, withAuth } from '@/lib/api/middleware'

async function getNotifications(request: NextRequest) {
  const session = await getServerAuthSession()
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const type = searchParams.get('type') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = 20

    // Mock notifications data - in real implementation, this would come from database
    const mockNotifications = [
      {
        id: '1',
        uuid: 'notif-1',
        type: 'acquired_badge',
        url: '/journey/badges',
        text: 'You earned the <strong>Functional February</strong> badge!',
        imageType: 'icon',
        imageUrl: '/badges/functional-february.svg',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        readAt: null,
        isRead: false,
        status: 'unread',
        links: {
          markAsRead: '/api/notifications/1/mark-read',
          all: '/notifications'
        }
      },
      {
        id: '2',
        uuid: 'notif-2',
        type: 'mentor_started_discussion',
        url: '/mentoring/discussions/abc123',
        text: 'Your mentor <strong>alice</strong> started a discussion on your <strong>Hello World</strong> solution.',
        imageType: 'avatar',
        imageUrl: '/avatars/alice.jpg',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        readAt: null,
        isRead: false,
        status: 'unread',
        links: {
          markAsRead: '/api/notifications/2/mark-read',
          all: '/notifications'
        }
      },
      {
        id: '3',
        uuid: 'notif-3',
        type: 'mentor_replied_to_discussion',
        url: '/mentoring/discussions/def456',
        text: 'Your mentor replied to your <strong>Two Fer</strong> discussion.',
        imageType: 'avatar',
        imageUrl: '/avatars/mentor.jpg',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        readAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        status: 'read',
        links: {
          markAsRead: '/api/notifications/3/mark-read',
          all: '/notifications'
        }
      },
      {
        id: '4',
        uuid: 'notif-4',
        type: 'approach_introduction_approved',
        url: '/tracks/javascript/exercises/hello-world/approaches',
        text: 'Your approach introduction for <strong>Hello World</strong> was approved!',
        imageType: 'exercise',
        imageUrl: '/exercises/hello-world.svg',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        status: 'read',
        links: {
          markAsRead: '/api/notifications/4/mark-read',
          all: '/notifications'
        }
      }
    ]

    // Filter notifications based on status and type
    let filteredNotifications = mockNotifications

    if (status !== 'all') {
      filteredNotifications = filteredNotifications.filter(n => n.status === status)
    }

    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type)
    }

    // Pagination
    const totalCount = filteredNotifications.length
    const totalPages = Math.ceil(totalCount / perPage)
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex)

    // Count unread notifications
    const unreadCount = mockNotifications.filter(n => !n.isRead).length

    return NextResponse.json({
      notifications: paginatedNotifications,
      meta: {
        currentPage: page,
        totalCount,
        totalPages,
        unreadCount
      }
    })

  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export const GET = withErrorHandling(withAuth(getNotifications))