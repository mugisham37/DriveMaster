import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Session from '@/components/mentoring/Session'

interface MentoringDiscussionPageProps {
  params: { uuid: string }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Mentoring Discussion - Exercism`,
    description: 'Mentor a student and help them improve their coding skills',
  }
}

export default async function MentoringDiscussionPage({
  params
}: MentoringDiscussionPageProps) {
  const user = await getCurrentUser()

  // Require authentication and mentor status
  if (!user) {
    redirect('/auth/signin?callbackUrl=/mentoring/discussions/' + params.uuid)
  }

  if (!user.isMentor) {
    redirect('/dashboard')
  }

  try {
    // Fetch discussion data from Rails API
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    const response = await fetch(`${railsApiUrl}/api/v1/mentoring/discussions/${params.uuid}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        notFound()
      }
      throw new Error('Failed to fetch discussion')
    }

    const discussionData = await response.json()

    // Transform the data to match the Session component props
    const sessionProps = {
      userHandle: user.handle,
      request: discussionData.request,
      discussion: discussionData.discussion,
      track: discussionData.track,
      exercise: discussionData.exercise,
      iterations: discussionData.iterations || [],
      instructions: discussionData.instructions || '',
      testFiles: discussionData.testFiles || [],
      student: discussionData.student,
      studentSolutionUuid: discussionData.studentSolutionUuid,
      mentorSolution: discussionData.mentorSolution,
      exemplarFiles: discussionData.exemplarFiles || [],
      guidance: {
        exercise: discussionData.guidance?.exercise || '',
        track: discussionData.guidance?.track || '',
        links: discussionData.guidance?.links || {}
      },
      outOfDate: discussionData.outOfDate || false,
      downloadCommand: discussionData.downloadCommand || '',
      scratchpad: {
        isIntroducerHidden: discussionData.scratchpad?.isIntroducerHidden || false,
        links: discussionData.scratchpad?.links || {
          markdown: '/docs/mentoring/markdown',
          hideIntroducer: '/api/settings/introducers/scratchpad',
          self: '/api/scratchpad'
        }
      },
      links: {
        mentorDashboard: '/mentoring/inbox',
        mentorQueue: '/mentoring/queue',
        exercise: `/tracks/${discussionData.track?.slug}/exercises/${discussionData.exercise?.slug}`,
        mentoringDocs: '/docs/mentoring'
      }
    }

    return <Session {...sessionProps} />

  } catch (error) {
    console.error('Error loading discussion:', error)
    
    // Fallback to mock data for development
    const mockSessionProps = {
      userHandle: user.handle,
      request: {
        uuid: params.uuid,
        status: 'pending' as const,
        isLocked: false,
        trackSlug: 'javascript',
        exerciseSlug: 'hello-world',
        studentHandle: 'student',
        student: {
          handle: 'student',
          avatarUrl: '/assets/avatars/default.svg'
        },
        exercise: {
          id: 'hello-world',
          slug: 'hello-world',
          title: 'Hello World',
          iconUrl: '/assets/exercises/hello-world.svg',
          difficulty: 1,
          links: {
            self: '/tracks/javascript/exercises/hello-world'
          }
        }
      },
      discussion: null,
      track: {
        slug: 'javascript',
        title: 'JavaScript',
        iconUrl: '/assets/tracks/javascript.svg',
        highlightjsLanguage: 'javascript',
        indentSize: 2
      },
      exercise: {
        id: 'hello-world',
        slug: 'hello-world',
        title: 'Hello World',
        iconUrl: '/assets/exercises/hello-world.svg',
        difficulty: 1,
        links: {
          self: '/tracks/javascript/exercises/hello-world'
        }
      },
      iterations: [],
      instructions: 'Loading instructions...',
      testFiles: [],
      student: {
        id: 1,
        handle: 'student',
        avatarUrl: '/assets/avatars/default.svg',
        reputation: '0',
        isFavorited: false,
        numTotalDiscussions: 0,
        numDiscussionsWithMentor: 0
      },
      studentSolutionUuid: 'mock-uuid',
      mentorSolution: null,
      exemplarFiles: [],
      guidance: {
        exercise: '',
        track: '',
        links: {}
      },
      outOfDate: false,
      downloadCommand: '',
      scratchpad: {
        isIntroducerHidden: false,
        links: {
          markdown: '/docs/mentoring/markdown',
          hideIntroducer: '/api/settings/introducers/scratchpad',
          self: '/api/scratchpad'
        }
      },
      links: {
        mentorDashboard: '/mentoring/inbox',
        mentorQueue: '/mentoring/queue',
        exercise: '/tracks/javascript/exercises/hello-world',
        mentoringDocs: '/docs/mentoring'
      }
    }

    return <Session {...mockSessionProps} />
  }
}