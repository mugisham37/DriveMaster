'use client'

import React from 'react'
import type { SharePlatform } from '@/components/types'

interface ShareLinkProps {
  title: string
  shareTitle: string
  shareLink: string
  platforms: readonly SharePlatform[]
}

export function ShareLink({ title, shareTitle, shareLink, platforms }: ShareLinkProps): JSX.Element {
  const handleShare = (platform: SharePlatform) => {
    const url = platform.url
      .replace('{url}', encodeURIComponent(shareLink))
      .replace('{title}', encodeURIComponent(shareTitle))
    
    window.open(url, '_blank', 'width=600,height=400')
  }

  return (
    <div className="share-link">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="flex gap-2">
        {platforms.map((platform) => (
          <button
            key={platform.name}
            onClick={() => handleShare(platform)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
            style={{ borderColor: platform.color }}
          >
            <span className="text-sm">{platform.icon}</span>
            <span className="text-sm font-medium">{platform.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ShareLink