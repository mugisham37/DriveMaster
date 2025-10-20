import { Metadata } from 'next'
import { ContributingHeader } from '@/components/contributing'

export const metadata: Metadata = {
  title: 'Contributing - Exercism',
  description: 'Help build the best coding education platform by contributing to Exercism',
}

export default async function Contributing() {
  // In a real implementation, these would come from API calls
  const tasksSize = 1250
  const contributorsSize = 3400

  return (
    <div className="min-h-screen">
      <ContributingHeader 
        selectedTab="dashboard"
        tasksSize={tasksSize}
        contributorsSize={contributorsSize}
      />
      
      <div className="lg-container container py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Get Started Contributing</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Code Contributions</h3>
              <p className="text-gray-600 mb-4">
                Help improve exercises, add new features, or fix bugs in our codebase.
              </p>
              <a 
                href="/contributing/tasks" 
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                View Tasks
              </a>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Content Creation</h3>
              <p className="text-gray-600 mb-4">
                Write exercises, create learning materials, or help with documentation.
              </p>
              <a 
                href="/docs/building" 
                className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}