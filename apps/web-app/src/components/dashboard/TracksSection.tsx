import Link from 'next/link'
import { StudentTrack } from '@/types'
import { TrackIcon } from '@/components/common/TrackIcon'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { ProminentLink } from '@/components/common/ProminentLink'

interface TracksSectionProps {
  userTracks: StudentTrack[]
  numUserTracks: number
}

export function TracksSection({ userTracks, numUserTracks }: TracksSectionProps) {
  return (
    <section className="tracks-section">
      <div className="c-heading-with-count">
        <h3 className="--text text-h3">Your Tracks</h3>
        <div 
          className="--count" 
          aria-label={`${numUserTracks} tracks`}
        >
          {numUserTracks}
        </div>
      </div>

      <div className="tracks">
        {userTracks.map((userTrack) => (
          <Link 
            key={userTrack.slug}
            href={userTrack.webUrl} 
            className="track"
          >
            <TrackIcon 
              iconUrl={userTrack.iconUrl}
              title={userTrack.title}
            />
            
            <div className="info">
              <div className="title">{userTrack.title}</div>
              <div className="progress">
                <progress 
                  className="progress-bar" 
                  value={userTrack.numCompletedExercises} 
                  max={userTrack.numExercises}
                />
              </div>
              <div className="counts">
                {userTrack.numCompletedExercises} / {userTrack.numExercises} exercises completed
              </div>
            </div>
            
            <GraphicalIcon icon="chevron-right" className="action-icon" />
          </Link>
        ))}
      </div>

      {numUserTracks > userTracks.length ? (
        <ProminentLink href="/tracks">
          View all tracks
        </ProminentLink>
      ) : (
        <ProminentLink href="/tracks">
          Discover more tracks
        </ProminentLink>
      )}
    </section>
  )
}