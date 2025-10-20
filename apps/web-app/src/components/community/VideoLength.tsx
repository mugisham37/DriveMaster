'use client'

import React from 'react'

interface Video {
  length_in_minutes: number
}

interface VideoLengthProps {
  video: Video
  className?: string
}

export function VideoLength({
  video,
  className = ''
}: VideoLengthProps): React.JSX.Element {
  const formatVideoLength = (lengthInMinutes: number): string => {
    const hours = Math.floor(lengthInMinutes / 60)
    const minutes = lengthInMinutes % 60

    const parts: string[] = []

    if (hours > 0) {
      const hourLabel = hours === 1 ? 'HR' : 'HRS'
      parts.push(`${hours.toString().padStart(2, '0')}${hourLabel}`)
    }

    if (minutes > 0) {
      const minuteLabel = minutes === 1 ? 'MIN' : 'MINS'
      parts.push(`${minutes.toString().padStart(2, '0')}${minuteLabel}`)
    }

    return `LENGTH ${parts.join(' ')}`
  }

  return (
    <span className={`video-length ${className}`}>
      {formatVideoLength(video.length_in_minutes)}
    </span>
  )
}

export default VideoLength