import { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { JourneyPageWrapper } from '@/components/journey/JourneyPageWrapper'

export const metadata: Metadata = {
  title: 'Your Badges - Exercism',
  description: 'View all the badges you have earned on Exercism.',
}

export default async function JourneyBadgesPage({
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
        query: {},
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
        query: {
          order: searchParams.order,
          criteria: searchParams.criteria,
          page: searchParams.page
        },
        options: {}
      }
    }
  ]

  return (
    <div id="page-journey">
      <div className="journey-hero">
        <div className="lg-container">
          <h1>Your Badges</h1>
          <p>View all the badges you have earned for your achievements on Exercism.</p>
        </div>
      </div>
      
      <div id="journey-content">
        <JourneyPageWrapper 
          defaultCategory="badges"
          categories={categories}
        />
      </div>
    </div>
  )
}