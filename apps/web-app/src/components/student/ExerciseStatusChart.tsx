// i18n-key-prefix:
// i18n-namespace: components/student/ExerciseStatusChart.tsx
import React from 'react'
import { default as ExerciseStatusDot } from './ExerciseStatusDot'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export function ExerciseStatusChart({
  exercisesData,
  links,
}: {
  exercisesData: { [slug: string]: [string, string] }
  links: { exercise: string; tooltip: string }
}): React.JSX.Element {
  const { t } = useAppTranslation('components/student/ExerciseStatusChart.tsx')
  return (
    <div className="exercises">
      {Object.keys(exercisesData).map((key) => {
        const slug = key
        const exerciseData = exercisesData[key]
        if (!exerciseData || exerciseData.length < 2) {
          return null
        }
        
        const status = exerciseData[0]
        const type = exerciseData[1]

        const dotLinks: {
          tooltip: string
          exercise?: string
        } = {
          tooltip: links.tooltip.replace('$SLUG', slug),
          ...(status !== 'locked' && { exercise: links.exercise.replace('$SLUG', slug) }),
        }

        if (
          status !== 'locked' &&
          status !== 'available' &&
          status !== 'started' &&
          status !== 'iterated' &&
          status !== 'completed' &&
          status !== 'published'
        ) {
          throw new Error(t('exerciseStatusChart.invalidStatus'))
        }

        return (
          <ExerciseStatusDot
            key={slug}
            exerciseStatus={status}
            type={type}
            links={dotLinks}
          />
        )
      })}
    </div>
  )
}

export default ExerciseStatusChart