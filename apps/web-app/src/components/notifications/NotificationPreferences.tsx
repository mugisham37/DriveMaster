'use client'

import React from 'react'

export interface NotificationPreferencesProps {
  userId?: string
  onSave?: (preferences: Record<string, unknown>) => void
}

export function NotificationPreferences({ userId, onSave }: NotificationPreferencesProps) {
  return (
    <div className="notification-preferences">
      <h3>Notification Preferences</h3>
      <p>User: {userId || 'Guest'}</p>
      {/* Preference controls would go here */}
      <button onClick={() => onSave?.({})}>Save Preferences</button>
    </div>
  )
}

export default NotificationPreferences
