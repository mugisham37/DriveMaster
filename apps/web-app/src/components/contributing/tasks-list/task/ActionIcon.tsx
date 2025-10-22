import React from 'react'
import { TaskAction } from '../../../types'

interface ActionIconProps {
  action: TaskAction
}

export function ActionIcon({ action }: ActionIconProps): React.JSX.Element {
  const getIconClass = (action: TaskAction): string => {
    switch (action) {
      case 'create':
        return 'fas fa-plus'
      case 'fix':
        return 'fas fa-wrench'
      case 'improve':
        return 'fas fa-arrow-up'
      case 'proofread':
        return 'fas fa-eye'
      case 'sync':
        return 'fas fa-sync'
      default:
        return 'fas fa-question'
    }
  }

  return (
    <i 
      className={`action-icon ${getIconClass(action)}`}
      aria-label={`${action} action`}
    />
  )
}