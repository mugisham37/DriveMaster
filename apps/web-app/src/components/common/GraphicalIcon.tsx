import React from 'react'

interface GraphicalIconProps {
  icon: string
  category?: 'graphics' | 'icons' | 'bootcamp'
  className?: string
  width?: number
  height?: number
  style?: React.CSSProperties
}

/**
 * GraphicalIcon component for displaying SVG icons and graphics
 * This is a placeholder implementation - in a real app, this would load actual SVG files
 */
export function GraphicalIcon({ 
  icon, 
  className = '', 
  width, 
  height,
  style 
}: GraphicalIconProps) {
  // Mock icon mapping - in real implementation, this would load actual SVG files
  const iconMap: Record<string, string> = {
    'community-with-exercism-logo': '🌟',
    'insiders': '💎',
    'party-popper': '🎉',
    'money-contribution': '💰',
    'organisation-contribution': '🏢',
    'social-contribution': '📱',
    'paypal': '💳',
    'external-site-github': '🐙',
    'play-circle': '▶️',
    'spinner': '⏳',
    'feature-discord': '💬',
    'feature-early-access': '🚀',
    'feature-no-ads': '🚫',
    'feature-youtube': '📺',
    'megaphone': '📢',
    'moon': '🌙',
    'robot': '🤖',
    'mentoring': '👥',
    'badges': '🏆',
    'perks': '✨',
    'favorites': '⭐',
    'insiders-lock': '🔒',
    'error-404': '❓',
    'error-500': '⚠️',
    'error-429': '🚦',
    // About page specific icons
    'exercism-face': '😊',
    'target-sparkle': '🎯',
    'pencil-edit': '✏️',
    'circle-arrow-right': '→',
    'purpose': '🎯',
    'principles': '✏️'
  }

  const iconContent = iconMap[icon] || '📄'

  const baseStyle: React.CSSProperties = {
    display: 'inline-block',
    fontSize: width ? `${width}px` : height ? `${height}px` : '24px',
    lineHeight: 1,
    ...style
  }

  return (
    <span 
      className={className}
      style={baseStyle}
      role="img"
      aria-label={icon}
    >
      {iconContent}
    </span>
  )
}