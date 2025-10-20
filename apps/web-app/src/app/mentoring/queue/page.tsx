import { Metadata } from 'next'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Queue from '@/components/mentoring/Queue'

export const metadata: Metadata = {
  title: 'Mentoring Queue - Exercism',
  description: 'Find students who need mentoring help on their solutions',
}

interface MentoringQueuePageProps {
  searchParams: {
    track_slug?: string
    exercise_slug?: string
    order?: string
    criteria?: string
    page?: string
  }
}

export default async function MentoringQueuePage({
  searchParams
}: MentoringQueuePageProps) {
  const session = await getServerAuthSession()

  // Require authentication and mentor status
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/mentoring/queue')
  }

  if (!session.user.isMentor) {
    redirect('/dashboard')
  }

  // Mock default track and exercise data - in real implementation, 
  // this would come from the server-side API call
  const defaultTrack = {
    slug: searchParams.track_slug || 'javascript',
    title: 'JavaScript',
    iconUrl: '/assets/tracks/javascript.svg',
    numSolutionsQueued: 0,
    exercises: []
  }

  const defaultExercise = searchParams.exercise_slug ? {
    slug: searchParams.exercise_slug,
    title: searchParams.exercise_slug.replace(/-/g, ' '),
    iconUrl: '/assets/exercises/default.svg'
  } : null

  // Prepare requests for the Queue component
  const queueRequest = {
    endpoint: '/api/mentoring/requests',
    query: {
      trackSlug: searchParams.track_slug || defaultTrack.slug,
      exerciseSlug: searchParams.exercise_slug,
      order: searchParams.order,
      criteria: searchParams.criteria,
      page: searchParams.page ? parseInt(searchParams.page) : 1
    },
    options: {}
  }

  const tracksRequest = {
    endpoint: '/api/mentoring/tracks',
    query: {},
    options: {}
  }

  const sortOptions = [
    { value: '', label: 'Sort by oldest first' },
    { value: 'recent', label: 'Sort by recent first' }
  ]

  const links = {
    tracks: '/api/mentoring/tracks',
    updateTracks: '/api/mentoring/tracks'
  }

  return (
    <div className="mentoring-queue-page">
      <header className="page-header">
        <h1>Mentoring Queue</h1>
        <p>Help students by providing feedback on their solutions</p>
      </header>

      <Queue
        queueRequest={queueRequest}
        tracksRequest={tracksRequest}
        defaultTrack={defaultTrack}
        defaultExercise={defaultExercise}
        sortOptions={sortOptions}
        links={links}
      />
    </div>
  )
}