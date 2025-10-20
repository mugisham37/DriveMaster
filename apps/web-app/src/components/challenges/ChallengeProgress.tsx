import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface Exercise {
  id: number
  slug: string
  title: string
  status: 'bronze' | 'silver' | 'gold' | 'none'
  completedTracks: Record<string, number>
  featuredTracks: string[]
}

interface ChallengeProgressProps {
  exercises: Exercise[]
  tracks: Record<string, string>
  challengeType: '48in24' | '12in23'
}

export function ChallengeProgress({ exercises, tracks, challengeType }: ChallengeProgressProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 gap-32 mx-auto exercises">
      {exercises.map((exercise) => {
        const numCompletedTracks = Object.keys(exercise.completedTracks).filter(
          track => exercise.completedTracks[track] === 2024
        ).length

        return (
          <div key={exercise.id} className={`exercise ${exercise.status}`}>
            <Link href={`/exercises/${exercise.slug}`} className="info">
              <Image 
                src={`https://assets.exercism.org/images/exercises/${exercise.slug}.svg`}
                alt={`Icon of ${exercise.title}`}
                width={64}
                height={64}
                className="exercise-icon c-icon"
              />
              <div className="text-h3 mb-16">{exercise.title}</div>
              
              {challengeType === '48in24' ? (
                <>
                  <progress className="progress-bar" value={numCompletedTracks} max={3} />
                  {numCompletedTracks > 2 ? (
                    <div className="count">{numCompletedTracks} completed during 2024</div>
                  ) : (
                    <div className="count">{numCompletedTracks} / 3 completed during 2024</div>
                  )}
                </>
              ) : (
                <div className="count">
                  {exercise.status === 'none' ? 'Not started' : `${exercise.status} status`}
                </div>
              )}
            </Link>
            
            <div className="featured">
              <div className="tracks">
                {exercise.featuredTracks.map((trackSlug) => {
                  const completed = exercise.completedTracks[trackSlug]
                  return (
                    <Link 
                      key={trackSlug}
                      href={`/tracks/${trackSlug}/exercises/${exercise.slug}`}
                      className={`track-icon ${completed ? 'completed' : ''}`}
                      title={`${tracks[trackSlug]} ${completed ? '(completed)' : ''}`}
                    >
                      <Image 
                        src={`https://assets.exercism.org/images/tracks/${trackSlug}.svg`}
                        alt={`Icon of ${tracks[trackSlug]}`}
                        width={24}
                        height={24}
                      />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}