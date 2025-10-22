import React from 'react'
import { MentorDiscussion } from '../../types'

interface DiscussionListProps {
  discussions: readonly MentorDiscussion[]
}

export function DiscussionList({ discussions }: DiscussionListProps): React.ReactElement {
  return (
    <div className="mentoring-discussion-list">
      {discussions.map((discussion) => (
        <div key={discussion.uuid} className="discussion-item">
          <div className="discussion-info">
            <span className="status">{discussion.status}</span>
            <span className="mentor">{discussion.mentor.handle}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default DiscussionList