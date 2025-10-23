import React from 'react'
import { BadgeRarity } from '@/components/types'

export interface BadgeMedallionProps {
  badge: {
    rarity: BadgeRarity
    iconName?: string
    iconUrl?: string
  }
  size?: 'small' | 'medium' | 'large'
}

export const BadgeMedallion: React.FC<BadgeMedallionProps> = ({
  badge,
  size = 'medium'
}): React.ReactElement => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  const rarityClasses = {
    common: 'bg-gray-200 border-gray-300',
    rare: 'bg-blue-200 border-blue-300',
    ultimate: 'bg-purple-200 border-purple-300',
    legendary: 'bg-yellow-200 border-yellow-300'
  }

  const displayIcon = badge.iconName || (badge.iconUrl ? 'B' : '?')

  return (
    <div className={`badge-medallion ${sizeClasses[size]} ${rarityClasses[badge.rarity]} rounded-full border-2 flex items-center justify-center`}>
      {badge.iconUrl ? (
        <img src={badge.iconUrl} alt={badge.iconName || 'Badge'} className="w-full h-full object-cover rounded-full" />
      ) : (
        <span className="text-xs font-bold">{displayIcon.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}

export default BadgeMedallion