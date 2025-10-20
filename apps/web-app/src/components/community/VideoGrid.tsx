'use client'

import React from 'react'
import { YoutubePlayer } from '@/components/common/YoutubePlayer'

interface VideoGridProps {
  itemsPerRow?: number
  videos?: Array<{
    id: string
    title: string
    youtubeId: string
  }>
}

// Mock data - in real implementation, this would come from props or API
const mockVideos = [
  {
    id: '1',
    title: 'Introduction to Functional Programming',
    youtubeId: 'dQw4w9WgXcQ'
  },
  {
    id: '2',
    title: 'Building REST APIs with Go',
    youtubeId: 'oHg5SJYRHA0'
  },
  {
    id: '3',
    title: 'JavaScript Testing Strategies',
    youtubeId: 'kJQP7kiw5Fk'
  },
  {
    id: '4',
    title: 'Python Data Structures',
    youtubeId: 'ScMzIvxBSi4'
  },
  {
    id: '5',
    title: 'Ruby Metaprogramming',
    youtubeId: 'y8Kyi0WNg40'
  },
  {
    id: '6',
    title: 'Rust Memory Management',
    youtubeId: 'Ks-_Mh1QhMc'
  }
]

export function VideoGrid({ 
  itemsPerRow = 2, 
  videos = mockVideos 
}: VideoGridProps): React.JSX.Element {
  const gridCols = itemsPerRow === 3 
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
    : 'grid-cols-1 md:grid-cols-2'

  return (
    <div className="video-grid">
      <h2 className="text-h2 mb-8">Community Videos</h2>
      <p className="text-p-large text-textColor5 mb-24">
        Watch programming tutorials, live coding sessions, and interviews from our community.
      </p>
      
      <div className={`grid ${gridCols} gap-24`}>
        {videos.map((video) => (
          <div key={video.id} className="video-item">
            <YoutubePlayer 
              videoId={video.youtubeId} 
              context="community" 
            />
            <h3 className="text-h5 mt-12">{video.title}</h3>
          </div>
        ))}
      </div>
    </div>
  )
}

export default VideoGrid