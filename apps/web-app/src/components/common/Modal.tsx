'use client'

import React, { useEffect, useRef } from 'react'

interface ModalProps {
  html: string
}

export function Modal({ html }: ModalProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.innerHTML = html
    }
  }, [html])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-auto">
        <div ref={modalRef} className="p-6" />
      </div>
    </div>
  )
}

export default Modal