import React from 'react'
// import type { CompleteRepresentationData } from '../../../types' // Unused

interface RightPaneProps {
  data: {
    submissions: Array<{
      uuid: string
      testsStatus: string
      createdAt: string
      student: {
        handle: string
        avatarUrl: string
      }
    }>
  }
}

export function RightPane({ data }: RightPaneProps): React.JSX.Element {
  return (
    <div className="representation-right-pane">
      <h3>Submissions ({data.submissions.length})</h3>
      
      <div className="submissions-list">
        {data.submissions.map((submission) => (
          <div key={submission.uuid} className="submission-item">
            <div className="submission-header">
              <div className="student-info">
                <img src={submission.student.avatarUrl} alt={`${submission.student.handle} avatar`} className="student-avatar" />
                <span>{submission.student.handle}</span>
              </div>
              <div className="submission-meta">
                <span className="tests-status">{submission.testsStatus}</span>
                <span className="created-at">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {data.submissions.length === 0 && (
        <div className="no-submissions">
          <p>No submissions found for this representation.</p>
        </div>
      )}
    </div>
  )
}