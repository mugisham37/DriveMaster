import { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { JourneyPageWrapper } from '@/components/journey/JourneyPageWrapper'

export const metadata: Metadata = {
  title: 'Your Journey - Exercism',
  description: 'Track your learning progress, view your solutions, badges, and reputation on Exercism.',
}

export default async function JourneyPage() {
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
        query: {},
        options: {}
      }
    }
  ]

  return (
    <div id="page-journey">
      <div className="journey-hero">
        <div className="lg-container">
          <h1>Your Journey</h1>
          <p>Track your progress, view your solutions, and see how you&apos;re growing as a developer.</p>
        </div>
      </div>
      
      <div id="journey-content">
        <JourneyPageWrapper 
          defaultCategory="overview"
          categories={categories}
        />
      </div>
    </div>
  )
}