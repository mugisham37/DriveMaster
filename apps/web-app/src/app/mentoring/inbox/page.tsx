import { Metadata } from 'next'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Inbox from '@/components/mentoring/Inbox'

export const metadata: Metadata = {
  title: 'Mentoring Inbox - Exercism',
  description: 'Manage your mentoring discussions and help students improve their code',
}

interface MentoringInboxPageProps {
  searchParams: {
    status?: string
    track_slug?: string
    order?: string
    criteria?: string
    page?: string
  }
}

export default async function MentoringInboxPage({
  searchParams
}: MentoringInboxPageProps) {
  const session = await getServerAuthSession()

  // Require authentication and mentor status
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/mentoring/inbox')
  }

  if (!session.user.isMentor) {
    redirect('/dashboard')
  }

  // Prepare requests for the Inbox component
  const discussionsRequest = {
    endpoint: '/api/mentoring/discussions',
    query: {
      status: (searchParams.status || 'awaiting_mentor') as 'awaiting_mentor' | 'awaiting_student' | 'finished',
      order: searchParams.order || '',
      criteria: searchParams.criteria || '',
      page: searchParams.page ? parseInt(searchParams.page) : 1,
      trackSlug: searchParams.track_slug || ''
    },
    options: { staleTime: 0 }
  }

  const tracksRequest = {
    endpoint: '/api/mentoring/tracks',
    query: { status: (searchParams.status || 'awaiting_mentor') as 'awaiting_mentor' | 'awaiting_student' | 'finished' },
    options: { staleTime: 0 }
  }

  const sortOptions = [
    { value: 'recent', label: 'Sort by recent first' },
    { value: 'oldest', label: 'Sort by oldest first' },
    { value: 'exercise', label: 'Sort by exercise' },
    { value: 'student', label: 'Sort by student' }
  ]

  const links = {
    queue: '/mentoring/queue'
  }

  return (
    <div className="mentoring-inbox-page">
      <header className="page-header">
        <h1>Mentoring Inbox</h1>
        <p>Manage your ongoing mentoring discussions</p>
      </header>

      <Inbox
        discussionsRequest={discussionsRequest}
        tracksRequest={tracksRequest}
        sortOptions={sortOptions}
        links={links}
      />
    </div>
  )
}