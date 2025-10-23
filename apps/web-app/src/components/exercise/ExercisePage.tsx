'use client'

import { User } from 'next-auth'
import { ExerciseData } from '@/lib/api/exercise'
import { Layout } from '@/components/layout/Layout'
import { ExerciseHeader } from './ExerciseHeader'
import { ExerciseInstructions } from './ExerciseInstructions'
import { ExerciseFiles } from './ExerciseFiles'
import { ExerciseActions } from './ExerciseActions'

interface ExercisePageProps extends ExerciseData {
  user: User | null
}

export function ExercisePage({ 
  exercise, 
  track, 
  instructions, 
  files, 
  user 
}: ExercisePageProps) {
  return (
    <Layout>
      <div id="page-exercise">
        <ExerciseHeader 
          exercise={exercise} 
          track={track}
          selectedTab="overview"
        />

        <div className="lg-container container">
          <div className="exercise-content">
            <div className="main-content">
              <ExerciseInstructions 
                instructions={instructions}
                exercise={exercise}
              />
              
              <ExerciseFiles files={files} />
            </div>

            <div className="sidebar">
              <ExerciseActions 
                exercise={exercise}
                track={track}
                user={user}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}