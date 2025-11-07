'use client'

import React from 'react'

export interface NotificationAnalyticsDashboardProps {
  stats?: {
    sent: number
    opened: number
    clicked: number
  }
}

export function NotificationAnalyticsDashboard({ stats }: NotificationAnalyticsDashboardProps) {
  return (
    <div className="notification-analytics-dashboard">
      <h3>Notification Analytics</h3>
      <div className="stats">
        <p>Sent: {stats?.sent || 0}</p>
        <p>Opened: {stats?.opened || 0}</p>
        <p>Clicked: {stats?.clicked || 0}</p>
      </div>
    </div>
  )
}

export default NotificationAnalyticsDashboard
