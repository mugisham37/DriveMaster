import { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { JourneyPageWrapper } from '@/components/journey/JourneyPageWrapper'

export const metadata: Metadata = {
  title: 'Your Solutions - Exercism',
  description: 'View and manage all your exercise solutions on Exercism.',
}

export default async function JourneySolutionsPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  await requireAuth()

  const categories = [
    {
      id: 'overview',
      title: 'Overview',
      icon: 'overview',
      path: '/journey',
      request: {
        endpoint: '/api/journey/overview',
        query: {},
        options: {}
      }
    },
    {
      id: 'solutions',
      title: 'Solutions',
      icon: 'editor', 
      path: '/journey/solutions',
      request: {
        endpoint: '/api/journey/solutions',
        query: {
          criteria: searchParams.criteria,
          track_slug: searchParams.track_id,
          status: searchParams.status,
          mentoring_status: searchParams.mentoring_status,
          sync_status: searchParams.sync_status,
          tests_status: searchParams.tests_status,
          head_tests_status: searchParams.head_tests_status,
          page: searchParams.page,
          order: searchParams.order || 'newest_first'
        },
        options: {}
      }
    },
    {
      id: 'reputation',
      title: 'Reputation',
      icon: 'reputation',
      path: '/journey/reputation',
      request: {
        endpoint: '/api/journey/reputation',
        query: {},
        options: {}
      }
    },
    {
      id: 'badges',
      title: 'Badges',
      icon: 'badges',
      path: '/journey/badges',
      request: {
        endpoint: '/api/journey/badges',
        query: {},
        options: {}
      }
    }
  ]

  return (
    <div id="page-journey">
      <div className="journey-hero">
        <div className="lg-container">
          <h1>Your Solutions</h1>
          <p>View and manage all your exercise solutions.</p>
        </div>
      </div>
      
      <div id="journey-content">
        <JourneyPageWrapper 
          defaultCategory="solutions"
          categories={categories}
        />
      </div>
    </div>
  )
}