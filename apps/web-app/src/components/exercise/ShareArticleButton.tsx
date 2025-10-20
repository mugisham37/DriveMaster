'use client'

import React from 'react'
import { ShareButton } from '@/components/common/ShareButton'
import { serializeExerciseArticleForSharing, type ExerciseArticle } from '@/lib/serializers/exercise-sharing'

interface ShareArticleButtonProps {
  article: ExerciseArticle
  className?: string
}

export function ShareArticleButton({ article, className = '' }: ShareArticleButtonProps): React.JSX.Element {
  const shareData = serializeExerciseArticleForSharing(article)
  
  return (
    <ShareButton
      title={shareData.title}
      shareTitle={shareData.shareTitle}
      shareLink={shareData.shareLink}
      platforms={shareData.platforms}
      className={className}
    />
  )
}

export default ShareArticleButton