'use client'

import React, { useEffect, useRef } from 'react'

interface ModalProps {
  html?: string
  children?: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

export function Modal({ html, children, isOpen = true, onClose, className = '' }: ModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (modalRef.current && html) {
      modalRef.current.innerHTML = html
    }
  }, [html])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-auto ${className}`}>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
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