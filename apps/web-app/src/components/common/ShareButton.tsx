'use client'

import React, { useState, useCallback } from 'react'
import { GraphicalIcon } from './GraphicalIcon'
import { AccessibleModal } from './AccessibleModal'

interface SharePlatform {
  name: string
  icon: string
  url: string
  color: string
}

interface ShareButtonProps {
  title: string
  shareTitle: string
  shareLink: string
  platforms: SharePlatform[]
  className?: string
}

export function ShareButton({
  title,
  shareTitle,
  shareLink,
  platforms,
  className = ''
}: ShareButtonProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        url: shareLink
      }).catch(console.error)
    } else {
      setIsModalOpen(true)
    }
  }, [shareTitle, shareLink])

  const handlePlatformShare = useCallback((platform: SharePlatform) => {
    const url = platform.url
      .replace('{url}', encodeURIComponent(shareLink))
      .replace('{title}', encodeURIComponent(shareTitle))
    
    window.open(url, '_blank', 'width=600,height=400')
    setIsModalOpen(false)
  }, [shareLink, shareTitle])

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to copy link: ', err)
    }
  }, [shareLink])

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className={`share-button ${className}`}
        title={title}
      >
        <GraphicalIcon icon="share" />
        <span>Share</span>
      </button>

      <AccessibleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Share ${shareTitle}`}
      >
        <div className="share-modal">
          <div className="share-platforms">
            {platforms.map((platform) => (
              <button
                key={platform.name}
                type="button"
                onClick={() => handlePlatformShare(platform)}
                className="share-platform-button"
                style={{ backgroundColor: platform.color }}
              >
                <GraphicalIcon icon={platform.icon} />
                <span>{platform.name}</span>
              </button>
            ))}
          </div>

          <div className="share-link-section">
            <label htmlFor="share-link-input">Or copy link:</label>
            <div className="share-link-input-group">
              <input
                id="share-link-input"
                type="text"
                value={shareLink}
                readOnly
                className="share-link-input"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="copy-link-button"
              >
                <GraphicalIcon icon="copy" />
              </button>
            </div>
          </div>
        </div>
      </AccessibleModal>
    </>
  )
}

export default ShareButton
