'use client'

import React from 'react'
import { ShareLink } from '@/components/common/ShareLink'
import { serializeExerciseArticleForSharing, type ExerciseArticle } from '@/lib/serializers/exercise-sharing'

interface ShareArticleLinkProps {
  article: ExerciseArticle
  className?: string
}

export function ShareArticleLink({ article, className = '' }: ShareArticleLinkProps): React.JSX.Element {
  const shareData = serializeExerciseArticleForSharing(article)
  
  return (
    <ShareLink
      title={shareData.title}
      shareTitle={shareData.shareTitle}
      shareLink={shareData.shareLink}
      platforms={shareData.platforms}
      className={className}
    />
  )
}

export default ShareArticleLink