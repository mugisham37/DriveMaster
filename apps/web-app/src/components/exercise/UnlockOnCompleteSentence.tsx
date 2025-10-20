import React from 'react'
import { Exercise } from '@/types'

interface UserTrack {
  id: number
  slug: string
  isJoined: boolean
  unlockableExercisesForExercise: (exercise: Exercise) => Exercise[]
  unlockableConceptsForExercise: (exercise: Exercise) => Array<{ name: string }>
}

interface UnlockOnCompleteSentenceProps {
  exercise: Exercise
  userTrack: UserTrack
}

export function UnlockOnCompleteSentence({ exercise, userTrack }: UnlockOnCompleteSentenceProps): React.JSX.Element | null {
  // Only show for concept exercises
  if (exercise.type !== 'concept') {
    return null
  }

  const unlockableExercises = userTrack.unlockableExercisesForExercise(exercise)
  const unlockableConcepts = userTrack.unlockableConceptsForExercise(exercise)
  
  const numUnlockableExercises = unlockableExercises.length
  const unlockableConceptNames = unlockableConcepts.map(concept => concept.name)

  // Don't show if nothing will be unlocked
  if (numUnlockableExercises === 0) {
    return null
  }

  // Helper function for pluralization
  const pluralize = (count: number, singular: string, plural?: string) => {
    if (count === 1) {
      return `${count} ${singular}`
    }
    return `${count} ${plural || singular + 's'}`
  }

  // Helper function to create sentence from array
  const toSentence = (items: string[]) => {
    if (items.length === 0) return ''
    if (items.length === 1) return items[0]
    if (items.length === 2) return `${items[0]} and ${items[1]}`
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
  }

  let sentence = `By marking ${exercise.title} as complete, you'll unlock `

  if (unlockableConceptNames.length > 0) {
    sentence += `${pluralize(unlockableConceptNames.length, 'concept')} `
    sentence += `(${toSentence(unlockableConceptNames)}) and `
  }

  sentence += `${pluralize(numUnlockableExercises, 'new exercise')}.`

  return (
    <div className="unlock-on-complete-sentence">
      <p className="text-textColor6 text-15 leading-paragraph">
        {sentence}
      </p>
    </div>
  )
}

export default UnlockOnCompleteSentence