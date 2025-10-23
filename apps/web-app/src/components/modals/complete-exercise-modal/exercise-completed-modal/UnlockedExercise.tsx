import React from 'react'
import { ExerciseIcon } from '../../../common'

interface UnlockedExerciseProps {
  title: string
  iconUrl: string
  links: {
    self: string
  }
}

export const UnlockedExercise = ({
  title,
  iconUrl,
  links,
}: UnlockedExerciseProps): React.ReactElement => {
  return (
    <a
      href={links.self}
      key={title}
      className="c-exercise-widget --skinny --interactive"
    >
      <ExerciseIcon iconUrl={iconUrl} />
      <div className="--info">
        <div className="--title">{title}</div>
      </div>
    </a>
  )
}
