/**
 * Achievement Notification System
 * 
 * Manages the display and lifecycle of achievement notifications with
 * positioning, stacking, and animation coordination.
 * 
 * Requirements: 3.1
 */

'use client'

import React from 'react'
import { AchievementNotification } from './AchievementNotification'
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications'
import type { UseAchievementNotificationsOptions } from '@/hooks/useAchievementNotifications'

// ============================================================================
// Types
// ============================================================================

export interface AchievementNotificationSystemProps extends UseAchievementNotificationsOptions {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  className?: string
  zIndex?: number
}

// ============================================================================
// Position Configurations
// ============================================================================

const POSITION_CLASSES = {
  'top-right': 'fixed top-4 right-4',
  'top-left': 'fixed top-4 left-4',
  'bottom-right': 'fixed bottom-4 right-4',
  'bottom-left': 'fixed bottom-4 left-4',
  'center': 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
}

const STACKING_OFFSETS = {
  'top-right': { x: 0, y: 1 },
  'top-left': { x: 0, y: 1 },
  'bottom-right': { x: 0, y: -1 },
  'bottom-left': { x: 0, y: -1 },
  'center': { x: 0, y: 1 }
}

// ============================================================================
// Main Component
// ============================================================================

export function AchievementNotificationSystem({
  position = 'top-right',
  className = '',
  zIndex = 1000,
  ...hookOptions
}: AchievementNotificationSystemProps): React.JSX.Element {
  const {
    activeAchievements,
    dismissAchievement,
    trackAchievementShare
  } = useAchievementNotifications(hookOptions)

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleAchievementClose = (achievementId: string) => {
    dismissAchievement(achievementId)
  }

  const handleAchievementShare = (achievementId: string, platform: 'twitter' | 'facebook' | 'linkedin' | 'copy') => {
    trackAchievementShare(achievementId, platform)
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const getAchievementStyle = (index: number): React.CSSProperties => {
    const offset = STACKING_OFFSETS[position]
    const spacing = 16 // pixels between notifications
    
    return {
      transform: `translate(${offset.x * index * spacing}px, ${offset.y * index * spacing}px)`,
      zIndex: zIndex - index // Newer notifications appear on top
    }
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  if (activeAchievements.length === 0) {
    return <></>
  }

  return (
    <div className={`achievement-notification-system ${POSITION_CLASSES[position]} ${className}`}>
      <div className="space-y-4">
        {activeAchievements.map((achievement, index) => (
          <div
            key={achievement.id}
            style={getAchievementStyle(index)}
            className="relative"
          >
            <AchievementNotification
              achievement={achievement}
              onClose={() => handleAchievementClose(achievement.id)}
              onShare={(platform) => handleAchievementShare(achievement.id, platform)}
              showAnimation={true}
              autoClose={hookOptions.autoCloseDelay !== undefined}
              autoCloseDelay={hookOptions.autoCloseDelay}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default AchievementNotificationSystem