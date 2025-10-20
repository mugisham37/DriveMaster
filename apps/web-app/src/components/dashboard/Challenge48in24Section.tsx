import Link from 'next/link'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { YoutubePlayer } from '@/components/common/YoutubePlayer'

export function Challenge48in24Section() {
  // Calculate current week (this would be dynamic in real implementation)
  const startDate = new Date('2024-01-15')
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const week = Math.ceil(diffDays / 7)

  // Mock featured exercise data (this would come from API)
  const featuredExercise = {
    week,
    title: 'Two Fer',
    learningOpportunity: 'Learn about string interpolation and default parameters.',
    slug: 'two-fer'
  }

  // Mock generic exercise data
  const genericExercise = {
    deepDiveYoutubeId: 'dQw4w9WgXcQ' // This would be real YouTube ID
  }

  if (!featuredExercise) return null

  return (
    <div className="flex flex-col items-start mb-12">
      <Link 
        href="/challenges/48in24" 
        className="text-adaptivePurple font-semibold leading-150 flex items-center mb-4"
      >
        <span className="emoji mr-6">📆</span>
        <span>Week {week} of Challenge</span>
      </Link>
      
      <h2 className="text-h3">
        Featuring: {featuredExercise.title}
      </h2>
      
      <p className="text-p-base mb-6">
        {featuredExercise.learningOpportunity}
      </p>

      {genericExercise.deepDiveYoutubeId && (
        <>
          <div className="text-p-base mb-8 font-medium text-textColor2">
            Watch the Deep Dive
          </div>
          <div className="w-[100%] md:max-w-[500px]">
            <YoutubePlayer 
              videoId={genericExercise.deepDiveYoutubeId}
              context="dashboard"
            />
          </div>
        </>
      )}

      <Link 
        href="/challenges/48in24" 
        className="btn btn-secondary btn-base mb-28 bg-backgroundColor1"
      >
        <span>Explore all exercises</span>
        <GraphicalIcon icon="arrow-right" />
      </Link>
    </div>
  )
}