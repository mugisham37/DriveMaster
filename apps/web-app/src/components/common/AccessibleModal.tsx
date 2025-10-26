import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFocusManagement } from '@/hooks/useKeyboardNavigation'
import { useFocusRestore, useLiveRegion } from '@/hooks/useAccessibility'
import { assembleClassNames } from '@/utils/assemble-classnames'

export interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  overlayClassName?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  initialFocus?: React.RefObject<HTMLElement>
  ariaDescribedBy?: string
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  overlayClassName = '',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocus,
  ariaDescribedBy
}: AccessibleModalProps): React.JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`)
  const { containerRef, trapFocus, focusFirst } = useFocusManagement()
  const { saveFocus, restoreFocus } = useFocusRestore()
  const { announce } = useLiveRegion()

  // Handle opening/closing effects
  useEffect(() => {
    if (isOpen) {
      // Save current focus
      saveFocus()
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      // Focus management
      setTimeout(() => {
        if (initialFocus?.current) {
          initialFocus.current.focus()
        } else {
          focusFirst()
        }
      }, 100)
      
      // Announce modal opening
      announce(`Modal opened: ${title}`)
    } else {
      // Restore body scroll
      document.body.style.overflow = ''
      
      // Restore focus
      restoreFocus()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, saveFocus, restoreFocus, focusFirst, initialFocus, announce, title])

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle focus trapping
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      trapFocus(e)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, trapFocus])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      className={assembleClassNames(
        'fixed inset-0 z-50 flex items-center justify-center',
        overlayClassName
      )}
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={(el) => {
          modalRef.current = el
          containerRef.current = el
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        aria-describedby={ariaDescribedBy}
        className={assembleClassNames(
          'relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 
            id={titleId.current}
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close modal"
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )

  // Render in portal
  return createPortal(modalContent, document.body)
}
