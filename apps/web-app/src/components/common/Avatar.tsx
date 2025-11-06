'use client'

import React from 'react'

interface AvatarProps {
  user: {
    avatarUrl: string
    handle: string
    flair?: { id: string } | null
  }
  size?: 'small' | 'medium' | 'large'
}

/**
 * Basic Avatar component for user display
 */
export function Avatar({ user, size = 'medium' }: AvatarProps) {
  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-10 h-10 text-base',
    large: 'w-12 h-12 text-lg'
  }

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user.handle}'s avatar`}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    )
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold`}>
      {user.handle.charAt(0).toUpperCase()}
    </div>
  )
}

export default Avatar