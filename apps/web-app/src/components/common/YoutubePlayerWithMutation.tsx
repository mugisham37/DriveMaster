import React from 'react'

interface YoutubePlayerWithMutationProps {
  videoId: string
  className?: string
  onPlay?: () => void
  onPause?: () => void
  onEnd?: () => void
}

export function YoutubePlayerWithMutation({
  videoId,
  className = '',
  onPlay,
  onPause,
  onEnd,
}: YoutubePlayerWithMutationProps): React.JSX.Element {
  const handlePlay = () => {
    onPlay?.()
  }

  const handlePause = () => {
    onPause?.()
  }

  const handleEnd = () => {
    onEnd?.()
  }

  return (
    <div className={`youtube-player-container ${className}`}>
      <iframe
        width="100%"
        height="315"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => {
          // Add event listeners for YouTube API events if needed
          // This is a simplified version - full implementation would use YouTube IFrame API
        }}
      />
    </div>
  )
}