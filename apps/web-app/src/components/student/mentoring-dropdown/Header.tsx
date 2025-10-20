import React from 'react'
import { SolutionMentoringStatus } from '../../../types'

interface HeaderProps {
  mentoringStatus: SolutionMentoringStatus
  shareLink: string
}

export function Header({ mentoringStatus, shareLink }: HeaderProps): React.JSX.Element {
  return (
    <div className="mentoring-dropdown-header">
      <h3>Mentoring</h3>
      <div className="status">{mentoringStatus}</div>
      <a href={shareLink} className="share-link">Share</a>
    </div>
  )
}

export default Header