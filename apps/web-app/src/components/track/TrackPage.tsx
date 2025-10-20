'use client'

import { User } from 'next-auth'
import { TrackData } from '@/lib/api/track'
import { Layout } from '@/components/layout/Layout'
import { TrackHeader } from './TrackHeader'
import { TrackExercises } from './TrackExercises'
import { TrackConcepts } from './TrackConcepts'

interface TrackPageProps extends TrackData {
  user: User | null
  searchParams: { [key: string]: string | string[] | undefined }
}

export function TrackPage({ 
  track, 
  exercises, 
  concepts, 
  isJoined, 
  user,
  searchParams 
}: TrackPageProps) {
  return (
    <Layout>
      <div id="page-track">
        <TrackHeader 
          track={track} 
          isJoined={isJoined}
          user={user}
          selectedTab="overview"
          {...(isJoined && {
            userTrack: {
              id: 1, // TODO: Get from actual user track data
              slug: track.slug,
              isJoined: true,
              isExternal: false, // TODO: Get from actual track data
              isCourse: track.course || false,
              isPracticeMode: false // TODO: Get from actual user track data
            }
          })}
        />

        <div className="lg-container container">
          <div className="track-content">
            <TrackExercises 
              track={track}
              exercises={exercises}
              searchParams={searchParams}
            />
            
            {track.course && (
              <TrackConcepts 
                track={track}
                concepts={concepts}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}