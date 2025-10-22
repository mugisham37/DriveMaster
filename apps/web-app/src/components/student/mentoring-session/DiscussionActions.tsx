import React from 'react'
import { MentorDiscussion, MentoringSessionDonation } from '../../../types'

interface DiscussionActionsProps {
  discussion: MentorDiscussion
  links: {
    exercise: string
    exerciseMentorDiscussionUrl: string
    learnMoreAboutPrivateMentoring: string
    privateMentoring: string
    mentoringGuide: string
    createMentorRequest: string
    donationsSettings: string
    donate: string
  }
  donation: MentoringSessionDonation
  onFinish?: () => void
  onMarkAsNothingToDo?: () => void
}

export function DiscussionActions({ 
  discussion,
  links,
  onFinish, 
  onMarkAsNothingToDo
}: DiscussionActionsProps): React.JSX.Element {
  const canFinish = discussion.status === 'awaiting_student'
  const canMarkAsNothingToDo = discussion.status === 'awaiting_mentor'

  return (
    <div className="discussion-actions">
      {canFinish && onFinish && (
        <button 
          type="button" 
          onClick={onFinish}
          className="btn-primary"
        >
          Finish Discussion
        </button>
      )}
      {canMarkAsNothingToDo && onMarkAsNothingToDo && (
        <button 
          type="button" 
          onClick={onMarkAsNothingToDo}
          className="btn-secondary"
        >
          Mark as Nothing To Do
        </button>
      )}
      <div className="links">
        <a href={links.exercise} className="exercise-link">
          Back to Exercise
        </a>
        <a href={links.mentoringGuide} className="guide-link">
          Mentoring Guide
        </a>
      </div>
    </div>
  )
}

export default DiscussionActions