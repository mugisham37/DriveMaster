import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Journey Overview API route
 * GET /api/journey/overview - Get user journey overview data
 */

export async function GET(_: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    // Journey requires authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Mock data structure matching the Ruby implementation
    const overviewData = {
    overview: {
      learning: {
        tracks: [
          {
            title: "JavaScript",
            slug: "javascript",
            numExercises: 139,
            numCompletedExercises: 25,
            numCompletedMentoringDiscussions: 5,
            numInProgressMentoringDiscussions: 2,
            numQueuedMentoringRequests: 1,
            numConceptsLearnt: 15,
            numSolutions: 25,
            numLines: 1250,
            iconUrl: "/tracks/javascript.svg",
            startedAt: "2024-01-15T10:00:00Z",
            progressChart: {
              data: [0, 5, 12, 18, 25],
              period: "week"
            }
          },
          {
            title: "Python",
            slug: "python", 
            numExercises: 156,
            numCompletedExercises: 42,
            numCompletedMentoringDiscussions: 8,
            numInProgressMentoringDiscussions: 1,
            numQueuedMentoringRequests: 0,
            numConceptsLearnt: 28,
            numSolutions: 42,
            numLines: 2100,
            iconUrl: "/tracks/python.svg",
            startedAt: "2023-11-20T14:30:00Z",
            progressChart: {
              data: [0, 8, 20, 35, 42],
              period: "week"
            }
          }
        ],
        links: {
          tracks: "/tracks"
        }
      },
      mentoring: {
        tracks: [
          {
            title: "JavaScript",
            slug: "javascript",
            iconUrl: "/tracks/javascript.svg",
            numDiscussions: 15,
            numStudents: 12
          }
        ],
        totals: {
          discussions: 15,
          students: 12,
          ratio: 1.25
        },
        ranks: {
          discussions: 150,
          students: 200
        },
        links: {
          mentoring: "/mentoring"
        }
      },
      contributing: {
        tracks: [
          {
            slug: null,
            title: "All Tracks",
            iconUrl: "/icons/contribute.svg",
            totalReputation: 125
          }
        ],
        links: {
          contributing: "/contributing"
        }
      },
      badges: {
        badges: [
          {
            id: 1,
            name: "Rookie",
            description: "Submitted your first solution",
            iconUrl: "/badges/rookie.svg",
            rarity: "common",
            unlockedAt: "2024-01-16T10:00:00Z"
          },
          {
            id: 2,
            name: "Dedicated",
            description: "Completed 10 exercises",
            iconUrl: "/badges/dedicated.svg", 
            rarity: "rare",
            unlockedAt: "2024-02-01T15:30:00Z"
          }
        ],
        links: {
          badges: "/journey/badges"
        }
      }
    }
  }

    return NextResponse.json(overviewData)
    
  } catch (error) {
    console.error('Journey overview fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}