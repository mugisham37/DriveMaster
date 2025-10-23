import React from 'react'
import { MentoredTrackExercise } from '../../../types'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import { ErrorBoundary } from '../../ErrorBoundary'

type Props = {
  status: string
  exercises: MentoredTrackExercise[]
  value: MentoredTrackExercise | null
  setValue: (exercise: MentoredTrackExercise) => void
  error: Error | null
}

export function ExerciseFilterList({
  status,
  exercises,
  value,
  setValue,
  error,
}: Props) {
  return (
    <div className="exercise-filter-list">
      <h3>Filter by Exercise</h3>
      <ErrorBoundary>
        {status === 'loading' ? (
          <LoadingSpinner />
        ) : (
          <div className="exercises-list">
            {exercises.map((exercise) => (
              <button
                key={exercise.slug}
                className={`exercise-button ${
                  exercise.slug === value?.slug ? 'selected' : ''
                }`}
                onClick={() => setValue(exercise)}
              >
                <span>{exercise.title}</span>
              </button>
            ))}
          </div>
        )}
      </ErrorBoundary>
    </div>
  )
}