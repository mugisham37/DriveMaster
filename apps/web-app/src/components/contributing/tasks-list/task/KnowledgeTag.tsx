import React from 'react'
import { TaskKnowledge } from '../../../types'

interface KnowledgeTagProps {
  knowledge: TaskKnowledge
}

export function KnowledgeTag({ knowledge }: KnowledgeTagProps): React.JSX.Element {
  const getKnowledgeClass = (knowledge: TaskKnowledge): string => {
    switch (knowledge) {
      case 'none':
        return 'knowledge-none'
      case 'elementary':
        return 'knowledge-elementary'
      case 'intermediate':
        return 'knowledge-intermediate'
      case 'advanced':
        return 'knowledge-advanced'
      default:
        return 'knowledge-unknown'
    }
  }

  return (
    <span className={`knowledge-tag ${getKnowledgeClass(knowledge)}`}>
      {knowledge}
    </span>
  )
}