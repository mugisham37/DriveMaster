/**
 * Achievement Notification Component
 * 
 * Displays achievement celebrations with animated effects, badges, points,
 * and sharing functionality for learning achievements.
 * 
 * Requirements: 3.1
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import type { AchievementNotificationRequest } from '@/types/notification-service'

// ============================================================================
// Types
// ============================================================================

export interface AchievementNotificationProps {
  achievement: AchievementNotificationRequest & {
    id?: string
    timestamp?: Date
  }
  onClose?: () => void
  onShare?: (platform: 'twitter' | 'facebook' | 'linkedin' | 'copy') => void
  showAnimation?: boolean
  autoClose?: boolean
  autoCloseDelay?: number
  className?: string
}

interface AnimationState {
  stage: 'entering' | 'celebrating' | 'stable' | 'exiting'
  progress: number
}

// ============================================================================
// Animation Configurations
// ============================================================================

const ANIMATION_STAGES = {
  entering: { duration: 800, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  celebrating: { duration: 1200, easing: 'ease-in-out' },
  stable: { duration: 0, easing: 'linear' },
  exiting: { duration: 400, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
}

const CONFETTI_COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', 
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'
]

// ============================================================================
// Main Component
// ============================================================================

export function AchievementNotification({
  achievement,
  onClose,
  onShare,
  showAnimation = true,
  autoClose = false,
  autoCloseDelay = 8000,
  className = ''
}: AchievementNotificationProps): React.JSX.Element {
  // ============================================================================
  // State Management
  // ============================================================================

  const [animationState, setAnimationState] = useState<AnimationState>({
    stage: showAnimation ? 'entering' : 'stable',
    progress: 0
  })
  const [isVisible, setIsVisible] = useState(true)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [confettiParticles, setConfettiParticles] = useState<Array<{
    id: number
    x: number
    y: number
    vx: number
    vy: number
    color: string
    size: number
    rotation: number
    rotationSpeed: number
  }>>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const timeoutRef = useRef<NodeJS.Timeout>()

  // ============================================================================
  // Animation Effects
  // ============================================================================

  useEffect(() => {
    if (!showAnimation) return

    let startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const stage = animationState.stage
      const config = ANIMATION_STAGES[stage]
      
      if (config.duration === 0) {
        setAnimationState(prev => ({ ...prev, progress: 1 }))
        return
      }

      const progress = Math.min(elapsed / config.duration, 1)
      setAnimationState(prev => ({ ...prev, progress }))

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // Move to next stage
        if (stage === 'entering') {
          startTime = Date.now()
          setAnimationState({ stage: 'celebrating', progress: 0 })
          generateConfetti()
          animationFrameRef.current = requestAnimationFrame(animate)
        } else if (stage === 'celebrating') {
          setAnimationState({ stage: 'stable', progress: 1 })
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animationState.stage, showAnimation])

  // Auto-close effect
  useEffect(() => {
    if (autoClose && animationState.stage === 'stable') {
      timeoutRef.current = setTimeout(() => {
        handleClose()
      }, autoCloseDelay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [autoClose, autoCloseDelay, animationState.stage])

  // Confetti animation
  useEffect(() => {
    if (confettiParticles.length === 0) return

    const animateConfetti = () => {
      setConfettiParticles(particles => 
        particles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.5, // gravity
            rotation: particle.rotation + particle.rotationSpeed
          }))
          .filter(particle => particle.y < window.innerHeight + 50)
      )

      if (confettiParticles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animateConfetti)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animateConfetti)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [confettiParticles.length])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleClose = () => {
    if (showAnimation) {
      setAnimationState({ stage: 'exiting', progress: 0 })
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, ANIMATION_STAGES.exiting.duration)
    } else {
      setIsVisible(false)
      onClose?.()
    }
  }

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'copy') => {
    onShare?.(platform)
    setShowShareMenu(false)

    // Generate share content
    const shareText = `🎉 I just earned the "${achievement.achievementName}" achievement! ${achievement.achievementDescription}`
    const shareUrl = achievement.shareUrl || window.location.href

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
        break
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank')
        break
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`, '_blank')
        break
      case 'copy':
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        // Could show a toast notification here
        break
    }
  }

  const generateConfetti = () => {
    const particles = []
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    for (let i = 0; i < 50; i++) {
      particles.push({
        id: i,
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * -8 - 2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      })
    }

    setConfettiParticles(particles)
  }

  // ============================================================================
  // Animation Styles
  // ============================================================================

  const getAnimationStyles = (): React.CSSProperties => {
    const { stage, progress } = animationState

    switch (stage) {
      case 'entering':
        const enterScale = 0.3 + (progress * 0.7)
        const enterOpacity = progress
        return {
          transform: `scale(${enterScale}) translateY(${(1 - progress) * 50}px)`,
          opacity: enterOpacity
        }
      
      case 'celebrating':
        const celebrateScale = 1 + Math.sin(progress * Math.PI * 4) * 0.05
        const celebrateRotation = Math.sin(progress * Math.PI * 2) * 2
        return {
          transform: `scale(${celebrateScale}) rotate(${celebrateRotation}deg)`,
          opacity: 1
        }
      
      case 'exiting':
        const exitScale = 1 - (progress * 0.3)
        const exitOpacity = 1 - progress
        return {
          transform: `scale(${exitScale}) translateY(${progress * -30}px)`,
          opacity: exitOpacity
        }
      
      default:
        return {
          transform: 'scale(1)',
          opacity: 1
        }
    }
  }

  const getBadgeAnimationStyles = (): React.CSSProperties => {
    const { stage, progress } = animationState

    if (stage === 'celebrating') {
      const pulseScale = 1 + Math.sin(progress * Math.PI * 6) * 0.1
      return {
        transform: `scale(${pulseScale})`,
        filter: `brightness(${1 + Math.sin(progress * Math.PI * 4) * 0.2})`
      }
    }

    return {}
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderConfetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50">
      {confettiParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: '2px'
          }}
        />
      ))}
    </div>
  )

  const renderShareMenu = () => (
    <div className="absolute top-full right-0 mt-2 bg-white rounded-8 shadow-lg border border-borderColor6 py-2 min-w-[160px] z-10">
      <button
        onClick={() => handleShare('twitter')}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
      >
        <Icon icon="twitter" className="w-4 h-4 text-blue-400" />
        Twitter
      </button>
      <button
        onClick={() => handleShare('facebook')}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
      >
        <Icon icon="facebook" className="w-4 h-4 text-blue-600" />
        Facebook
      </button>
      <button
        onClick={() => handleShare('linkedin')}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
      >
        <Icon icon="linkedin" className="w-4 h-4 text-blue-700" />
        LinkedIn
      </button>
      <button
        onClick={() => handleShare('copy')}
        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
      >
        <Icon icon="clipboard" className="w-4 h-4 text-gray-600" />
        Copy Link
      </button>
    </div>
  )

  // ============================================================================
  // Main Render
  // ============================================================================

  if (!isVisible) return <></>

  return (
    <>
      {showAnimation && renderConfetti()}
      
      <div
        ref={containerRef}
        className={`achievement-notification bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-16 p-6 shadow-xl max-w-md mx-auto ${className}`}
        style={getAnimationStyles()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="achievement-badge w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
              style={getBadgeAnimationStyles()}
            >
              {achievement.achievementIcon ? (
                <img 
                  src={achievement.achievementIcon} 
                  alt="Achievement" 
                  className="w-8 h-8"
                />
              ) : (
                <Icon icon="trophy" className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                🎉 Achievement Unlocked!
              </h3>
              <p className="text-sm text-gray-600">
                {achievement.timestamp ? new Date(achievement.timestamp).toLocaleTimeString() : 'Just now'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icon="x-mark" className="w-5 h-5" />
          </button>
        </div>

        {/* Achievement Details */}
        <div className="mb-4">
          <h4 className="text-xl font-bold text-gray-800 mb-2">
            {achievement.achievementName}
          </h4>
          <p className="text-gray-600 leading-relaxed">
            {achievement.achievementDescription}
          </p>
        </div>

        {/* Points and Badge */}
        <div className="flex items-center justify-between mb-4">
          {achievement.points && (
            <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded-full">
              <Icon icon="star" className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">
                +{achievement.points} points
              </span>
            </div>
          )}
          
          {achievement.badgeUrl && (
            <div className="flex items-center gap-2">
              <img 
                src={achievement.badgeUrl} 
                alt="Badge" 
                className="w-8 h-8 rounded-full border-2 border-yellow-300"
              />
              <span className="text-sm text-gray-600">Badge earned</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <FormButton
            onClick={handleClose}
            className="btn-secondary btn-s"
          >
            <Icon icon="check" className="w-4 h-4 mr-1" />
            Awesome!
          </FormButton>

          <div className="relative">
            <FormButton
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="btn-ghost btn-s"
            >
              <Icon icon="share" className="w-4 h-4 mr-1" />
              Share
            </FormButton>
            
            {showShareMenu && renderShareMenu()}
          </div>
        </div>

        {/* Click outside to close share menu */}
        {showShareMenu && (
          <div 
            className="fixed inset-0 z-5"
            onClick={() => setShowShareMenu(false)}
          />
        )}
      </div>
    </>
  )
}

export default AchievementNotification