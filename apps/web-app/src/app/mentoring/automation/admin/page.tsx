import { Metadata } from 'next'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Admin from '@/components/mentoring/representations/Admin'

export const metadata: Metadata = {
  title: 'Admin Representations - Exercism',
  description: 'Administrative view of all mentoring representations and feedback',
}

interface AdminPageProps {
  searchParams: {
    only_mentored_solutions?: string
    criteria?: string
    track_slug?: string
    order?: string
    page?: string
  }
}

export default async function AdminPage({
  searchParams
}: AdminPageProps) {
  const session = await getServerAuthSession()

  // Require authentication and mentor status
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/mentoring/automation/admin')
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

  // Prepare request for admin representations
  const representationsRequest = {
    endpoint: '/api/mentoring/representations/admin',
    query: {
      onlyMentoredSolutions: searchParams.only_mentored_solutions === 'true',
      criteria: searchParams.criteria,
      trackSlug: searchParams.track_slug,
      order: searchParams.order || 'most_recent_feedback',
      page: searchParams.page ? parseInt(searchParams.page) : 1
    },
    options: {}
  }

  const sortOptions = [
    { value: 'most_recent_feedback', label: 'Most recent feedbacks' },
    { value: 'least_recent_feedback', label: 'Least recent feedbacks' }
  ]

  const links = {
    withoutFeedback: '/mentoring/automation',
    withFeedback: '/mentoring/automation/with-feedback',
    hideIntroducer: '/api/settings/introducers/feedback_automation'
  }

  // Check if user has dismissed the introducer
  const isIntroducerHidden = false // TODO: Implement user preferences check

  return (
    <div className="mentoring-admin-page">
      <header className="page-header">
        <h1>Admin Representations</h1>
        <p>Administrative overview of all mentoring automation</p>
      </header>

      <Admin
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