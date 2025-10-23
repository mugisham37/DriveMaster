import React from 'react'

export interface VimeoEmbedProps {
  videoId?: string
  id?: string
  title?: string
  width?: number
  height?: number
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  className?: string
}

export const VimeoEmbed: React.FC<VimeoEmbedProps> = ({
  videoId,
  id,
  title = 'Vimeo video',
  width = 640,
  height = 360,
  autoplay = false,
  loop = false,
  muted = false,
  className = ''
}) => {
  const actualVideoId = videoId || id || ''
  const src = `https://player.vimeo.com/video/${actualVideoId}?autoplay=${autoplay ? 1 : 0}&loop=${loop ? 1 : 0}&muted=${muted ? 1 : 0}`

  return (
    <div className={`vimeo-embed ${className}`}>
      <iframe
        src={src}
        width={width}
        height={height}
        style={{ border: 'none' }}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title={title}
      />
    </div>
  )
}

export default VimeoEmbed