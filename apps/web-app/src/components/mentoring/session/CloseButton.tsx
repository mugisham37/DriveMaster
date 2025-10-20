import React from 'react'

interface CloseButtonProps {
  url?: string
  onClick?: () => void
  disabled?: boolean
}

export function CloseButton({ url, onClick, disabled = false }: CloseButtonProps): React.JSX.Element {
  if (url) {
    return (
      <a
        href={url}
        className="close-button"
        aria-label="Close"
      >
        ×
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="close-button"
      aria-label="Close"
    >
      ×
    </button>
  )
}

export default CloseButton