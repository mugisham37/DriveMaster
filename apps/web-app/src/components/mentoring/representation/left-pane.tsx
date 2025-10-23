import React from 'react'

interface LeftPaneProps {
  links: {
    self: string
  }
  representation: {
    id: number
    exercise: {
      title: string
      iconUrl: string
    }
    track: {
      title: string
      iconUrl: string
    }
    numSubmissions: number
    appearsFrequently: boolean
    feedback: {
      author: {
        handle: string
        avatarUrl: string
      }
      content: string
      contentHtml: string
    } | null
    lastSubmittedAt: string
  }
}

export function LeftPane({ representation }: LeftPaneProps): React.JSX.Element {
  return (
    <div className="representation-left-pane">
      <div className="representation-header">
        <h2>Representation #{representation.id}</h2>
        <div className="exercise-info">
          <img src={representation.exercise.iconUrl} alt={`${representation.exercise.title} exercise icon`} className="exercise-icon" />
          <span>{representation.exercise.title}</span>
          <span className="track-info">
            <img src={representation.track.iconUrl} alt={`${representation.track.title} track icon`} className="track-icon" />
            {representation.track.title}
          </span>
        </div>
      </div>
      
      <div className="representation-stats">
        <div className="stat">
          <span className="label">Submissions:</span>
          <span className="value">{representation.numSubmissions}</span>
        </div>
        <div className="stat">
          <span className="label">Appears Frequently:</span>
          <span className="value">{representation.appearsFrequently ? 'Yes' : 'No'}</span>
        </div>
        <div className="stat">
          <span className="label">Last Submitted:</span>
          <span className="value">{new Date(representation.lastSubmittedAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      {representation.feedback && (
        <div className="representation-feedback">
          <h3>Feedback</h3>
          <div className="feedback-author">
            <img src={representation.feedback.author.avatarUrl} alt={`${representation.feedback.author.handle} avatar`} className="author-avatar" />
            <span>{representation.feedback.author.handle}</span>
          </div>
          <div 
            className="feedback-content"
            dangerouslySetInnerHTML={{ __html: representation.feedback.contentHtml }}
          />
        </div>
      )}
    </div>
  )
}