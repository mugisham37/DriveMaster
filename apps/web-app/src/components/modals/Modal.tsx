'use client'

import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { GraphicalIcon } from '@/components/common'

export interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  theme?: 'light' | 'dark'
  cover?: boolean
  closeButton?: boolean
  ReactModalClassName?: string
  className?: string
  appElement?: HTMLElement
  aria?: {
    labelledby?: string
    describedby?: string
  }
  celebratory?: boolean
  style?: React.CSSProperties
}

export default function Modal({
  open,
  onClose,
  children,
  theme = 'light',
  cover = false,
  closeButton = false,
  ReactModalClassName = '',
  className = '',
  aria,
  celebratory = false,
  style,
}: ModalProps): React.JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  const modalContent = (
    <div 
      className={`modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 ${
        theme === 'dark' ? 'bg-black bg-opacity-75' : 'bg-black bg-opacity-50'
      } ${cover ? 'bg-opacity-90' : ''}`}
    >
      <div
        ref={modalRef}
        className={`modal-content relative bg-white rounded-8 shadow-xl max-h-[90vh] overflow-y-auto ${
          theme === 'dark' ? 'bg-backgroundColorE text-white' : 'bg-white text-textColor2'
        } ${celebratory ? 'celebratory' : ''} ${ReactModalClassName} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={aria?.labelledby}
        aria-describedby={aria?.describedby}
        style={style}
      >
        {closeButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-backgroundColorA transition-colors"
            aria-label="Close modal"
          >
            <GraphicalIcon icon="cross" className="h-4 w-4" />
          </button>
        )}
        
        {children}
      </div>
    </div>
  )

  // Use portal to render modal at document body level
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return null
}

export { Modal }