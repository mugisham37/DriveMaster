import Link from 'next/link'
import { Track, Exercise } from '@/types'
import { ExerciseIcon } from '@/components/common/ExerciseIcon'

interface TrackExercisesProps {
  track: Track
  exercises: Exercise[]
  searchParams: { [key: string]: string | string[] | undefined }
}

export function TrackExercises({ track, exercises, searchParams }: TrackExercisesProps) {
  return (
    <section className="track-exercises">
      <h2>Exercises</h2>
      
      <div className="exercises-grid">
        {exercises.map((exercise) => (
          <Link
            key={exercise.slug}
            href={`/tracks/${track.slug}/exercises/${exercise.slug}`}
            className="exercise-card"
          >
            <div className="exercise-header">
              <ExerciseIcon 
                iconUrl={exercise.iconUrl} 
                title={exercise.title} 
              />
              <div className="exercise-info">
                <h3 className="exercise-title">{exercise.title}</h3>
                <p className="exercise-blurb">{exercise.blurb}</p>
              </div>
            </div>
            
            <div className="exercise-meta">
              <span className={`difficulty difficulty-${exercise.difficulty}`}>
                {exercise.difficulty}
              </span>
              <span className={`type type-${exercise.type}`}>
                {exercise.type}
              </span>
              {exercise.isRecommended && (
                <span className="recommended">Recommended</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}