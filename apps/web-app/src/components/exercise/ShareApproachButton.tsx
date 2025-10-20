'use client'

import React from 'react'
import { ShareButton } from '@/components/common/ShareButton'
import { serializeExerciseApproachForSharing, type ExerciseApproach } from '@/lib/serializers/exercise-sharing'

interface ShareApproachButtonProps {
  approach: ExerciseApproach
  className?: string
}

export function ShareApproachButton({ approach, className = '' }: ShareApproachButtonProps): React.JSX.Element {
  const shareData = serializeExerciseApproachForSharing(approach)
  
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

export default ShareApproachButton