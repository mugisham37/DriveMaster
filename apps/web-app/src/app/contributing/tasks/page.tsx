import { Metadata } from 'next'
import { TasksList } from '@/components/contributing/TasksList'
import { ContributingHeader } from '@/components/contributing'

export const metadata: Metadata = {
  title: 'Contributing Tasks - Exercism',
  description: 'Find tasks to contribute to Exercism and help improve the platform.',
}

export default async function TasksPage() {
  // Mock data - in real implementation, this would come from API
  const tasksSize = 1250
  const contributorsSize = 3400

  return (
    <div className="min-h-screen">
      <ContributingHeader 
        selectedTab="tasks"
        tasksSize={tasksSize}
        contributorsSize={contributorsSize}
      />
      
      <div className="lg-container container py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Contributing Tasks</h2>
          <p className="text-lg text-gray-600 mb-8">
            Find tasks that match your skills and interests. Whether you&apos;re a developer, 
            writer, or designer, there&apos;s a way for you to contribute to Exercism.
          </p>
          
          <TasksList />
        </div>
      </div>
    </div>
  )
}