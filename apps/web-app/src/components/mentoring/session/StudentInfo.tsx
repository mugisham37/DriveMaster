import React from 'react'

type Props = {
  student: {
    handle: string
    avatarUrl: string
    reputation: number
    bio: string
  }
}

export function StudentInfo({ student }: Props) {
  return (
    <div className="student-info">
      <div className="student-header">
        <img src={student.avatarUrl} alt={student.handle} className="avatar" />
        <div className="student-details">
          <h3>{student.handle}</h3>
          <div className="reputation">Reputation: {student.reputation}</div>
        </div>
      </div>
      {student.bio && <p className="bio">{student.bio}</p>}
    </div>
  )
}