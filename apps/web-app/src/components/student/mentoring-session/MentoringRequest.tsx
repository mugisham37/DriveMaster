import React from 'react'
import { 
  MentorSessionTrack, 
  MentorSessionExercise, 
  MentorSessionRequest, 
  Iteration, 
  MentoringSessionLinks 
} from '@/types'

interface Video {
  url: string
  thumb: string
  title: string
  date: string
}

interface MentoringRequestProps {
  trackObjectives: string
  track: MentorSessionTrack
  exercise: MentorSessionExercise
  request?: MentorSessionRequest | undefined
  latestIteration?: Iteration | undefined
  videos: Video[]
  links: MentoringSessionLinks
  onCreate: (mentorRequest: MentorSessionRequest | undefined) => void
}

export function MentoringRequest({ 
  trackObjectives,
  track,
  exercise,
  request,
  latestIteration,
  videos,
  onCreate
}: MentoringRequestProps): React.ReactElement {
  const handleCreateRequest = () => {
    // Create a new mentoring request
    const newRequest: MentorSessionRequest = {
      uuid: `request-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      trackSlug: track.slug,
      exerciseSlug: exercise.slug,
      studentHandle: '',
      student: {
        handle: '',
        avatarUrl: ''
      },
      exercise: {
        id: exercise.id || '',
        slug: exercise.slug,
        title: exercise.title,
        iconUrl: exercise.iconUrl,
        difficulty: exercise.difficulty || 1,
        links: exercise.links
      }
    }
    onCreate(newRequest)
  }

  if (request) {
    return (
      <div className="mentoring-request">
        <div className="request-status">
          {request.status && (
            <span className={`status-badge ${request.status}`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          )}
        </div>
        
        <div className="request-info">
          {request.createdAt && (
            <p>Mentoring request created on {new Date(request.createdAt).toLocaleDateString()}</p>
          )}
          
          {request.status === 'pending' && (
            <div className="pending-info">
              <p>Your request is in the queue. A mentor will be with you soon!</p>
              <button 
                type="button" 
                onClick={() => onCreate(undefined)}
                className="btn-secondary btn-sm"
              >
                Cancel Request
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mentoring-request-form">
      <h3>Request Mentoring</h3>
      
      <div className="track-objectives">
        <h4>Track Objectives</h4>
        <p>{trackObjectives}</p>
      </div>

      <div className="exercise-info">
        <h4>{exercise.title}</h4>
        <p>Track: {track.title}</p>
        {latestIteration && (
          <p>Latest iteration: {latestIteration.idx}</p>
        )}
      </div>

      {videos.length > 0 && (
        <div className="videos">
          <h4>Helpful Videos</h4>
          {videos.map((video, idx) => (
            <div key={idx} className="video">
              <a href={video.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={video.thumb} alt={video.title} />
                <span>{video.title}</span>
              </a>
            </div>
          ))}
        </div>
      )}

      <button 
        type="button" 
        onClick={handleCreateRequest}
        className="btn-primary"
      >
        Request Mentoring
      </button>
    </div>
  )
}

export default MentoringRequest