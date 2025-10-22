import React from 'react'
import { TaskModule } from '../../../types'

interface ModuleTagProps {
  module: TaskModule
}

export function ModuleTag({ module }: ModuleTagProps): React.JSX.Element {
  const getModuleClass = (module: TaskModule): string => {
    switch (module) {
      case 'analyzer':
        return 'module-analyzer'
      case 'concept-exercise':
        return 'module-concept-exercise'
      case 'concept':
        return 'module-concept'
      case 'generator':
        return 'module-generator'
      case 'practice-exercise':
        return 'module-practice-exercise'
      case 'representer':
        return 'module-representer'
      case 'test-runner':
        return 'module-test-runner'
      default:
        return 'module-unknown'
    }
  }

  return (
    <span className={`module-tag ${getModuleClass(module)}`}>
      {module.replace('-', ' ')}
    </span>
  )
}