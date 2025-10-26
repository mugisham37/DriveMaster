import { Metadata } from 'next'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import WithFeedback from '@/components/mentoring/representations/WithFeedback'

export const metadata: Metadata = {
  title: 'Representations with Feedback - Exercism',
  description: 'Review and improve existing automated feedback for student solutions',
}

interface WithFeedbackPageProps {
  searchParams: {
    criteria?: string
    track_slug?: string
    order?: string
    page?: string
  }
}

export default async function WithFeedbackPage({
  searchParams
}: WithFeedbackPageProps) {
  const session = await getServerAuthSession()

  // Require authentication and mentor status
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/mentoring/automation/with-feedback')
  }

  if (!session.user.isMentor) {
    redirect('/dashboard')
  }

  // Mock tracks data - in real implementation, this would come from API
  const tracks = [
    { slug: 'javascript', title: 'JavaScript', iconUrl: '/assets/tracks/javascript.svg' },
    { slug: 'python', title: 'Python', iconUrl: '/assets/tracks/python.svg' },
    { slug: 'ruby', title: 'Ruby', iconUrl: '/assets/tracks/ruby.svg' }
  ]

  // Mock counts data
  const counts = {
    without_feedback: 42,
    with_feedback: 18,
    admin: 7
  }

  // Prepare request for representations with feedback
  const representationsRequest = {
    endpoint: '/api/mentoring/representations/with-feedback',
    query: {
      criteria: searchParams.criteria || '',
      trackSlug: searchParams.track_slug || '',
      order: searchParams.order || 'most_submissions',
      page: searchParams.page ? parseInt(searchParams.page) : 1
    },
    options: {}
  }

  const sortOptions = [
    { value: 'most_submissions', label: 'Sort by highest occurrence' },
    { value: 'most_recent', label: 'Sort by recent first' }
  ]

  const links = {
    withoutFeedback: '/mentoring/automation',
    admin: '/mentoring/automation/admin',
    hideIntroducer: '/api/settings/introducers/feedback_automation'
  }

  // Check if user has dismissed the introducer
  const isIntroducerHidden = false // TODO: Implement user preferences check

  return (
    <div className="mentoring-with-feedback-page">
      <header className="page-header">
        <h1>Representations with Feedback</h1>
        <p>Review and improve existing automated feedback</p>
      </header>

      <WithFeedback
        representationsRequest={representationsRequest}
        tracks={tracks}
        counts={counts}
        links={links}
        sortOptions={sortOptions}
        isIntroducerHidden={isIntroducerHidden}
      />
    </div>
  )
}