import { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { JourneyPageWrapper } from '@/components/journey/JourneyPageWrapper'

export const metadata: Metadata = {
  title: 'Your Reputation - Exercism',
  description: 'View your reputation history and see how you earned reputation points on Exercism.',
}

export default async function JourneyReputationPage({
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
        query: {
          category: searchParams.category,
          track: searchParams.track,
          page: searchParams.page
        },
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
          <h1>Your Reputation</h1>
          <p>View your reputation history and see how you earned reputation points.</p>
        </div>
      </div>
      
      <div id="journey-content">
        <JourneyPageWrapper 
          defaultCategory="reputation"
          categories={categories}
        />
      </div>
    </div>
  )
}