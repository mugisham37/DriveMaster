import React from 'react'
import type { AnalyzerComment } from '@/components/types'

interface CommentProps extends AnalyzerComment {
  className?: string
}

export function Comment({ 
  type, 
  html, 
  className = '' 
}: CommentProps): React.JSX.Element {
  const getTypeClassName = (commentType: string) => {
    switch (commentType) {
      case 'essential':
        return 'c-comment-essential'
      case 'actionable':
        return 'c-comment-actionable'
      case 'informative':
        return 'c-comment-informative'
      case 'celebratory':
        return 'c-comment-celebratory'
      default:
        return 'c-comment-default'
    }
  }

  return (
    <div 
      className={`c-analyzer-comment ${getTypeClassName(type)} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}