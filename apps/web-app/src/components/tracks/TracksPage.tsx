'use client'

import { ExercismUser } from '@/lib/auth/config'
import { Track } from '@/types'
import { Layout } from '@/components/layout/Layout'
import { TracksHeader } from './TracksHeader'
import TracksList from '@/components/student/TracksList'

interface TracksPageProps {
  tracks: Track[]
  numTracks: number
  trackIconUrls: string[]
  user: ExercismUser | null
  searchParams: { [key: string]: string | string[] | undefined }
}

export function TracksPage({ 
  tracks, 
  numTracks, 
  trackIconUrls, 
  searchParams 
}: TracksPageProps) {
  return (
    <Layout>
      <div id="page-tracks">
        <TracksHeader 
          numTracks={numTracks}
          trackIconUrls={trackIconUrls}
        />
        
        <TracksList 
          tagOptions={[]}
          request={{
            endpoint: '/api/tracks',
            query: searchParams,
            options: {
              initialData: tracks,
            }
          }}
        />
      </div>
    </Layout>
  )
}