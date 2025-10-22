import React from 'react'
import { TaskType } from '../../../types'

interface TypeIconProps {
  type: TaskType
}

export function TypeIcon({ type }: TypeIconProps): React.JSX.Element {
  const getIconClass = (type: TaskType): string => {
    switch (type) {
      case 'ci':
        return 'fas fa-cogs'
      case 'coding':
        return 'fas fa-code'
      case 'content':
        return 'fas fa-file-alt'
      case 'docker':
        return 'fab fa-docker'
      case 'docs':
        return 'fas fa-book'
      default:
        return 'fas fa-question'
    }
  }

  return (
    <i 
      className={`type-icon ${getIconClass(type)}`}
      aria-label={`${type} type`}
    />
  )
}