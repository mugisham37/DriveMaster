'use client'

import React, { useState, useCallback } from 'react'
import { GraphicalIcon } from './GraphicalIcon'

interface CopyToClipboardButtonProps {
  textToCopy: string
  className?: string
  children?: React.ReactNode
}

export function CopyToClipboardButton({
  textToCopy,
  className = '',
  children
}: CopyToClipboardButtonProps): React.React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }, [textToCopy])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`copy-to-clipboard-button ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {children || (
        <>
          <GraphicalIcon icon={copied ? 'check' : 'copy'} />
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </>
      )}
    </button>
  )
}

export default CopyToClipboardButton
