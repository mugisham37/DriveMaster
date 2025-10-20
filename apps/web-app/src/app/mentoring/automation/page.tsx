import { Metadata } from 'next'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import WithoutFeedback from '@/components/mentoring/representations/WithoutFeedback'

export const metadata: Metadata = {
  title: 'Mentoring Automation - Exercism',
  description: 'Automate your mentoring with representations and feedback',
}

interface MentoringAutomationPageProps {
  searchParams: {
    only_mentored_solutions?: string
    criteria?: string
    track_slug?: string
    order?: string
    page?: string
  }
}

export default async function MentoringAutomationPage({
  searchParams
}: MentoringAutomationPageProps) {
  const session = await getServerAuthSession()

  // Require authentication and mentor status
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/mentoring/automation')
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

  // Prepare request for representations without feedback
  const representationsRequest = {
    endpoint: '/api/mentoring/representations',
    query: {
      onlyMentoredSolutions: searchParams.only_mentored_solutions === 'true',
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
    withFeedback: '/mentoring/automation/with-feedback',
    admin: '/mentoring/automation/admin',
    hideIntroducer: '/api/settings/introducers/feedback_automation'
  }

  // Check if user has dismissed the introducer
  const isIntroducerHidden = false // TODO: Implement user preferences check

  return (
    <div className="mentoring-automation-page">
      <header className="page-header">
        <h1>Mentoring Automation</h1>
        <p>Provide feedback on common solutions to help students automatically</p>
      </header>

      <WithoutFeedback
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