'use client'

import React from 'react'

export interface PushPermissionFlowProps {
  onRequestPermission?: () => void
  onSkip?: () => void
}

export function PushPermissionFlow({ onRequestPermission, onSkip }: PushPermissionFlowProps) {
  return (
    <div className="push-permission-flow">
      <h3>Enable Push Notifications</h3>
      <p>Stay updated with important notifications</p>
      <button onClick={onRequestPermission}>Enable</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  )
}

export default PushPermissionFlow
