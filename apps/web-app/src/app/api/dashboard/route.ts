import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Dashboard API route matching Rails dashboard controller
 * GET /api/dashboard - Get user dashboard data
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    // Dashboard requires authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Connect to Rails API to fetch dashboard data
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/dashboard`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.id}`
        }
      })
      
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch dashboard data' },
          { status: response.status }
        )
      }
      
      const dashboardData = await response.json()
      
      // Return dashboard data in Rails-compatible format
      return NextResponse.json({
        featuredBadges: dashboardData.featured_badges?.map((badge: any) => ({
          uuid: badge.uuid,
          rarity: badge.rarity,
          iconName: badge.icon_name,
          name: badge.name,
          description: badge.description,
          isRevealed: badge.is_revealed,
          unlockedAt: badge.unlocked_at,
          numAwardees: badge.num_awardees,
          percentageAwardees: badge.percentage_awardees,
          links: {
            reveal: badge.links?.reveal || ''
          }
        })) || [],
        numBadges: dashboardData.num_badges || 0,
        blogPosts: dashboardData.blog_posts?.map((post: any) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          publishedAt: post.published_at,
          author: {
            name: post.author?.name || 'Exercism Team',
            avatarUrl: post.author?.avatar_url || '/assets/avatars/exercism-team.jpg'
          },
          imageUrl: post.image_url,
          links: {
            self: `/blog/${post.slug}`
          }
        })) || [],
        updates: dashboardData.updates?.map((update: any) => ({
          id: update.id,
          text: update.text,
          icon: update.icon,
          publishedAt: update.published_at,
          links: {
            self: update.links?.self || ''
          }
        })) || [],
        liveEvent: dashboardData.live_event ? {
          id: dashboardData.live_event.id,
          title: dashboardData.live_event.title,
          description: dashboardData.live_event.description,
          startsAt: dashboardData.live_event.starts_at,
          youtubeId: dashboardData.live_event.youtube_id,
          thumbnailUrl: dashboardData.live_event.thumbnail_url,
          youtube: dashboardData.live_event.youtube
        } : undefined,
        featuredEvent: dashboardData.featured_event ? {
          id: dashboardData.featured_event.id,
          title: dashboardData.featured_event.title,
          description: dashboardData.featured_event.description,
          startsAt: dashboardData.featured_event.starts_at,
          youtubeId: dashboardData.featured_event.youtube_id,
          thumbnailUrl: dashboardData.featured_event.thumbnail_url,
          youtube: dashboardData.featured_event.youtube
        } : undefined,
        scheduledEvents: dashboardData.scheduled_events?.map((event: any) => ({
          id: event.id,
          title: event.title,
          startsAt: event.starts_at
        })) || [],
        userTracks: dashboardData.user_tracks?.map((track: any) => ({
          slug: track.slug,
          title: track.title,
          iconUrl: track.icon_url,
          numCompletedExercises: track.num_completed_exercises,
          numExercises: track.num_exercises,
          lastTouchedAt: track.last_touched_at,
          isJoined: track.is_joined,
          isNew: track.is_new,
          links: {
            self: `/tracks/${track.slug}`
          }
        })) || [],
        numUserTracks: dashboardData.num_user_tracks || 0,
        mentorDiscussions: dashboardData.mentor_discussions?.map((discussion: any) => ({
          uuid: discussion.uuid,
          student: {
            handle: discussion.student?.handle,
            avatarUrl: discussion.student?.avatar_url,
            flair: discussion.student?.flair
          },
          exercise: {
            title: discussion.exercise?.title,
            iconUrl: discussion.exercise?.icon_url
          },
          track: {
            title: discussion.track?.title,
            iconUrl: discussion.track?.icon_url
          },
          isFinished: discussion.is_finished,
          postsCount: discussion.posts_count,
          updatedAt: discussion.updated_at,
          links: {
            self: `/mentoring/discussions/${discussion.uuid}`
          }
        })) || [],
        mentorQueueHasRequests: dashboardData.mentor_queue_has_requests || false
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback mock data for development
      return NextResponse.json({
        featuredBadges: [
          {
            uuid: '1',
            rarity: 'common',
            iconName: 'member',
            name: 'Member',
            description: 'Joined Exercism',
            isRevealed: true,
            unlockedAt: '2024-01-01T00:00:00Z',
            numAwardees: 1000,
            percentageAwardees: 50,
            links: { reveal: '' }
          }
        ],
        numBadges: 5,
        blogPosts: [
          {
            id: 1,
            title: 'Welcome to Exercism',
            slug: 'welcome-to-exercism',
            excerpt: 'Learn to code with our structured approach',
            publishedAt: '2024-01-01T00:00:00Z',
            author: {
              name: 'Exercism Team',
              avatarUrl: '/assets/avatars/exercism-team.jpg'
            },
            links: { self: '/blog/welcome-to-exercism' }
          }
        ],
        updates: [],
        userTracks: [],
        numUserTracks: 0,
        mentorDiscussions: [],
        mentorQueueHasRequests: false,
        scheduledEvents: []
      })
    }
    
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}