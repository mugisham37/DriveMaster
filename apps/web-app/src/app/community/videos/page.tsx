import { Metadata } from 'next'
import { VideoGrid } from '@/components/community/VideoGrid'
import { VideosSidebar } from '@/components/community/VideosSidebar'

export const metadata: Metadata = {
  title: 'Community Videos - Exercism',
  description: 'Watch programming tutorials, interviews, and live coding sessions from our community.',
}

// Mock data - in real implementation, this would come from API
const mockLiveEvent = {
  id: 1,
  title: 'Live Coding: Building a REST API with Go',
  description: 'Join us as we build a complete REST API using Go and PostgreSQL.',
  youtube: true,
  youtubeId: 'dQw4w9WgXcQ'
}

const mockFeaturedEvent = {
  id: 2,
  title: 'Functional Programming Fundamentals',
  description: 'An introduction to functional programming concepts using Elixir.',
  startsAt: '2024-02-15T19:00:00Z',
  youtube: true,
  youtubeId: 'dQw4w9WgXcQ',
  thumbnailUrl: '/assets/community/featured-event.jpg'
}

const mockScheduledEvents = [
  {
    id: 3,
    title: 'JavaScript Testing Best Practices',
    startsAt: '2024-02-20T18:00:00Z'
  },
  {
    id: 4,
    title: 'Python Data Structures Deep Dive',
    startsAt: '2024-02-22T20:00:00Z'
  }
]

export default function CommunityVideosPage() {
  return (
    <div id="page-community-videos">
      <div className="lg-container">
        <div className="flex pt-32 xl:gap-64 lg:gap-32 gap-64 lg:flex-row flex-col">
          <div className="flex-grow">
            <VideoGrid 
              itemsPerRow={3} 
              tracks={[]}
              request={{
                endpoint: '/api/community/videos',
                query: {},
                options: {}
              }}
            />
          </div>
          
          <div className="flex-shrink-0 pt-8 max-w-[380px]">
            <VideosSidebar 
              liveEvent={mockLiveEvent}
              featuredEvent={mockFeaturedEvent}
              scheduledEvents={mockScheduledEvents}
            />
          </div>
        </div>
      </div>
    </div>
  )
}