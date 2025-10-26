'use client'

import React, { useEffect, useRef } from 'react'

interface ModalProps {
  html?: string
  children?: React.ReactNode
  isOpen?: boolean
  open?: boolean
  onClose?: () => void | Promise<void>
  className?: string
  theme?: 'light' | 'dark'
  cover?: boolean
  closeButton?: boolean
  ReactModalClassName?: string
}

export function Modal({ 
  html, 
  children, 
  isOpen = true, 
  open, 
  onClose, 
  className = '',
  theme = 'light',
  cover = false,
  closeButton = false,
  ReactModalClassName = ''
}: ModalProps): React.ReactElement | null {
  const modalIsOpen = open !== undefined ? open : isOpen
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (modalRef.current && html) {
      modalRef.current.innerHTML = html
    }
  }, [html])

  if (!modalIsOpen) return null

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${
      theme === 'dark' ? 'bg-black/75' : 'bg-black/50'
    } ${cover ? 'bg-black/90' : ''}`}>
      <div className={`rounded-lg max-w-2xl max-h-[90vh] overflow-auto ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } ${ReactModalClassName} ${className}`}>
        {(onClose && closeButton) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10"
          >
            ×
          </button>
        )}
        {html ? (
          <div ref={modalRef} className="p-6" />
        ) : (
          <div className="p-6">{children}</div>
        )}
      </div>
    </div>
  )
}

export default Modal