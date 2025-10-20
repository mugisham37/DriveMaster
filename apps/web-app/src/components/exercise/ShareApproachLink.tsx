'use client'

import React from 'react'
import { ShareLink } from '@/components/common/ShareLink'
import { serializeExerciseApproachForSharing, type ExerciseApproach } from '@/lib/serializers/exercise-sharing'

interface ShareApproachLinkProps {
  approach: ExerciseApproach
  className?: string
}

export function ShareApproachLink({ approach, className = '' }: ShareApproachLinkProps): React.JSX.Element {
  const shareData = serializeExerciseApproachForSharing(approach)
  
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

export default ShareApproachLink