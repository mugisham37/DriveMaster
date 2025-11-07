'use client'

import React from 'react'

export interface NotificationCenterProps {
  userId?: string
  className?: string
}

export function NotificationCenter({ userId, className }: NotificationCenterProps) {
  return (
    <div className={`notification-center ${className || ''}`}>
      <div className="notification-center-header">
        <h2>Notifications</h2>
      </div>
      <div className="notification-center-content">
        {/* Notification list would go here */}
        <p>User ID: {userId || 'Guest'}</p>
      </div>
    </div>
  )
}

export default NotificationCenter
