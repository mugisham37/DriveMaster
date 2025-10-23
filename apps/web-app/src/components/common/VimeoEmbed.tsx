import React from 'react'

interface VimeoEmbedProps {
  videoId: string
  className?: string
  width?: number
  height?: number
}

export function VimeoEmbed({ 
  videoId, 
  className = '', 
  width = 640, 
  height = 360 
}: VimeoEmbedProps): React.ReactElement {
  return (
    <div className={`vimeo-embed ${className}`}>
      <iframe
        src={`https://player.vimeo.com/video/${videoId}`}
        width={width}
        height={height}
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title={`Vimeo video ${videoId}`}
      />
    </div>
  )
}