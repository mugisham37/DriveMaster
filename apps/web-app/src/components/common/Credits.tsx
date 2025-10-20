'use client'

import React from 'react'
import { Avatar } from './Avatar'

interface User {
  id: number
  handle: string
  name?: string
  avatarUrl: string
  reputation?: string
  flair?: {
    id: number
    name: string
    iconUrl: string
  }
}

interface CreditsProps {
  users: User[]
  topCount: number
  topLabel: string
  bottomCount: number
  bottomLabel: string
  cssClass?: string
  className?: string
}

export function Credits({
  users,
  topCount,
  topLabel,
  bottomCount,
  bottomLabel,
  cssClass,
  className = ''
}: CreditsProps): React.JSX.Element {
  const topUsers = users.slice(0, topCount)
  const remainingUsers = users.slice(topCount)
  const hasMoreUsers = remainingUsers.length > 0

  const classNames = [
    'credits',
    cssClass,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classNames}>
      {topUsers.length > 0 && (
        <div className="credits-section credits-top">
          <div className="credits-label">{topLabel}</div>
          <div className="credits-users">
            {topUsers.map(user => (
              <div key={user.id} className="credits-user">
                <Avatar user={user} />
                <div className="credits-user-info">
                  <div className="credits-user-handle">{user.handle}</div>
                  {user.name && (
                    <div className="credits-user-name">{user.name}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMoreUsers && (
        <div className="credits-section credits-bottom">
          <div className="credits-label">{bottomLabel}</div>
          <div className="credits-count">
            {bottomCount > 0 ? (
              <span>+{Math.min(bottomCount, remainingUsers.length)} more</span>
            ) : (
              <span>+{remainingUsers.length} more</span>
            )}
          </div>
          <div className="credits-avatars">
            {remainingUsers.slice(0, Math.min(10, bottomCount || remainingUsers.length)).map(user => (
              <Avatar
                key={user.id}
                user={user}
                className="credits-avatar-small"
              />
            ))}
            {remainingUsers.length > 10 && (
              <div className="credits-more-indicator">
                +{remainingUsers.length - 10}
              </div>
            )}
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="credits-empty">
          No contributors yet
        </div>
      )}
    </div>
  )
}

export default Credits
