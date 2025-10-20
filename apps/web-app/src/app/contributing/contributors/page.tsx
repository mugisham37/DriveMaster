import { Metadata } from 'next'
import { ContributorsList } from '@/components/contributing/ContributorsList'
import { ContributingHeader } from '@/components/contributing'

export const metadata: Metadata = {
  title: 'Contributors - Exercism',
  description: 'Meet the amazing contributors who help build and maintain Exercism.',
}

export default async function ContributorsPage() {
  // Mock data - in real implementation, this would come from API
  const tasksSize = 1250
  const contributorsSize = 3400

  return (
    <div className="min-h-screen">
      <ContributingHeader 
        selectedTab="contributors"
        tasksSize={tasksSize}
        contributorsSize={contributorsSize}
      />
      
      <div className="lg-container container py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Our Contributors</h2>
          <p className="text-lg text-gray-600 mb-8">
            Exercism is built by thousands of volunteers who contribute their time and expertise 
            to create exercises, maintain tracks, and help fellow programmers learn.
          </p>
          
          <ContributorsList />
        </div>
      </div>
    </div>
  )
}