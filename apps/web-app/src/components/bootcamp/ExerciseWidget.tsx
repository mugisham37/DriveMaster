'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface BootcampExercise {
  id: number
  slug: string
  title: string
  icon_url: string
  major_project?: boolean
  brain_buster?: boolean
}

interface BootcampProject {
  slug: string
}

interface BootcampSolution {
  uuid: string
  status: string
  passed_basic_tests: boolean
  passed_bonus_tests?: boolean
}

interface BootcampUserProject {
  id: number
  status: string
  exercise_status: (exercise: BootcampExercise, solution?: BootcampSolution) => string
}

interface ExerciseWidgetProps {
  exercise: BootcampExercise
  project?: BootcampProject
  solution?: BootcampSolution
  user_project?: BootcampUserProject
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function ExerciseWidget({
  exercise,
  project,
  solution,
  user_project,
  size = 'medium',
  className = ''
}: ExerciseWidgetProps): React.JSX.Element {
  // Determine status based on user project and solution
  const getStatus = () => {
    if (user_project && solution) {
      const status = user_project.exercise_status(exercise, solution)
      if (status === 'completed' && (solution.passed_bonus_tests || !exercise.brain_buster)) {
        return 'completed-bonus'
      }
      return status
    }
    return 'available'
  }

  const status = getStatus()
  const isLocked = status === 'locked'

  const widgetClasses = [
    'c-exercise-widget',
    status,
    exercise.major_project ? 'major-project' : '',
    exercise.brain_buster ? 'brain-buster' : '',
    `size-${size}`,
    className
  ].filter(Boolean).join(' ')

  const content = (
    <div className={widgetClasses}>
      <div className="flex items-start">
        <Image
          src={exercise.icon_url}
          alt={exercise.title}
          width={32}
          height={32}
          className="exercise-icon"
        />
        <div className="exercise-info">
          <h3 className="exercise-title">{exercise.title}</h3>
          {exercise.major_project && (
            <span className="badge major-project-badge">Major Project</span>
          )}
          {exercise.brain_buster && (
            <span className="badge brain-buster-badge">Brain Buster</span>
          )}
        </div>
      </div>
      
      {isLocked && (
        <div className="locked-overlay">
          <span>Locked</span>
        </div>
      )}
    </div>
  )

  if (isLocked || !project) {
    return <div>{content}</div>
  }

  return (
    <Link href={`/bootcamp/projects/${project.slug}/exercises/${exercise.slug}`}>
      {content}
    </Link>
  )
}

export default ExerciseWidget