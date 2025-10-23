'use client'

import { Modal } from '@/components/common'
import { GraphicalIcon } from '@/components/common'
import Link from 'next/link'
import Image from 'next/image'

interface Exercise {
  slug: string
  title: string
  iconUrl: string
  difficulty: number
  status: 'available' | 'started' | 'completed' | 'published' | 'locked'
  type: 'concept' | 'practice'
  blurb: string
  prerequisites: Array<{
    slug: string
    name: string
  }>
  practices: Array<{
    slug: string
    name: string
  }>
  track: {
    slug: string
    title: string
  }
}

interface ExerciseTooltipModalProps {
  exercise?: Exercise
  isOpen: boolean
  onClose: () => void

}

export function ExerciseTooltipModal({ 
  exercise, 
  isOpen, 
  onClose, 
}: ExerciseTooltipModalProps) {
  if (!exercise) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400'
      case 'started': return 'text-yellow-600 dark:text-yellow-400'
      case 'published': return 'text-blue-600 dark:text-blue-400'
      case 'locked': return 'text-gray-400 dark:text-gray-500'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'started': return 'In Progress'
      case 'published': return 'Published'
      case 'locked': return 'Locked'
      case 'available': return 'Available'
      default: return status
    }
  }

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-sm ${
          i < difficulty 
            ? 'text-yellow-400' 
            : 'text-gray-300 dark:text-gray-600'
        }`}
      >
        ★
      </span>
    ))
  }



  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      className="exercise-tooltip-modal"
      ReactModalClassName="max-w-[400px] p-0"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4 mb-4">
          <Image 
            src={exercise.iconUrl}
            alt={exercise.title}
            width={48}
            height={48}
            className="w-12 h-12 flex-shrink-0 rounded"
          />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 truncate">
              {exercise.title}
            </h3>
            
            <div className="flex items-center gap-3 text-sm">
              <span className={`font-medium ${getStatusColor(exercise.status)}`}>
                {getStatusText(exercise.status)}
              </span>
              
              <span className="text-gray-500 dark:text-gray-400 capitalize">
                {exercise.type}
              </span>
              
              <div className="flex items-center gap-1">
                {getDifficultyStars(exercise.difficulty)}
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {exercise.blurb}
        </p>

        {exercise.prerequisites.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Prerequisites:
            </h4>
            <div className="flex flex-wrap gap-2">
              {exercise.prerequisites.map((concept) => (
                <div
                  key={concept.slug}
                  className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 text-xs"
                >
                  <GraphicalIcon icon="concept" className="w-3 h-3" />
                  <span>{concept.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {exercise.practices.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Practices:
            </h4>
            <div className="flex flex-wrap gap-2">
              {exercise.practices.map((concept) => (
                <div
                  key={concept.slug}
                  className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/20 rounded-full px-2 py-1 text-xs"
                >
                  <GraphicalIcon icon="concept" className="w-3 h-3" />
                  <span>{concept.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {exercise.status !== 'locked' && (
            <Link
              href={`/tracks/${exercise.track.slug}/exercises/${exercise.slug}`}
              className="btn-xs btn-primary flex-1"
              onClick={onClose}
            >
              {exercise.status === 'available' ? 'Start Exercise' : 'Continue'}
            </Link>
          )}
          
          <button
            onClick={onClose}
            className="btn-xs btn-default"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ExerciseTooltipModal