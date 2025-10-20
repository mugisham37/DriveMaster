'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ModalState {
  id: string
  isOpen: boolean
  priority: number
  component: React.ComponentType<any>
  props?: any
}

interface UseModalManagerReturn {
  activeModal: ModalState | null
  registerModal: (modal: Omit<ModalState, 'isOpen'>) => void
  openModal: (id: string) => void
  closeModal: (id: string) => void
  closeAllModals: () => void
  isModalOpen: (id: string) => boolean
  canShowModal: (id: string) => boolean
}

// Global modal registry to prevent multiple modals showing simultaneously
const modalRegistry = new Map<string, ModalState>()
let activeModalId: string | null = null
let modalManagerInstance: UseModalManagerReturn | null = null

export function useModalManager(): UseModalManagerReturn {
  const [activeModal, setActiveModal] = useState<ModalState | null>(null)
  const [, forceUpdate] = useState({})
  const isInitialized = useRef(false)

  // Force re-render
  const triggerUpdate = useCallback(() => {
    forceUpdate({})
  }, [])

  useEffect(() => {
    if (!isInitialized.current) {
      modalManagerInstance = {
        activeModal,
        registerModal,
        openModal,
        closeModal,
        closeAllModals,
        isModalOpen,
        canShowModal
      }
      isInitialized.current = true
    }
  }, [])

  const registerModal = useCallback((modal: Omit<ModalState, 'isOpen'>) => {
    modalRegistry.set(modal.id, {
      ...modal,
      isOpen: false
    })
    triggerUpdate()
  }, [triggerUpdate])

  const openModal = useCallback((id: string) => {
    const modal = modalRegistry.get(id)
    if (!modal) return

    // Close any currently active modal
    if (activeModalId && activeModalId !== id) {
      const currentModal = modalRegistry.get(activeModalId)
      if (currentModal) {
        currentModal.isOpen = false
      }
    }

    // Open the requested modal
    modal.isOpen = true
    activeModalId = id
    setActiveModal({ ...modal })
    triggerUpdate()
  }, [triggerUpdate])

  const closeModal = useCallback((id: string) => {
    const modal = modalRegistry.get(id)
    if (!modal) return

    modal.isOpen = false
    
    if (activeModalId === id) {
      activeModalId = null
      setActiveModal(null)
    }
    
    triggerUpdate()
  }, [triggerUpdate])

  const closeAllModals = useCallback(() => {
    modalRegistry.forEach(modal => {
      modal.isOpen = false
    })
    activeModalId = null
    setActiveModal(null)
    triggerUpdate()
  }, [triggerUpdate])

  const isModalOpen = useCallback((id: string): boolean => {
    const modal = modalRegistry.get(id)
    return modal?.isOpen || false
  }, [])

  const canShowModal = useCallback((id: string): boolean => {
    // Can show if no modal is active or if this modal has higher priority
    if (!activeModalId) return true
    
    const activeModal = modalRegistry.get(activeModalId)
    const requestedModal = modalRegistry.get(id)
    
    if (!activeModal || !requestedModal) return false
    
    return requestedModal.priority > activeModal.priority
  }, [])

  return {
    activeModal,
    registerModal,
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    canShowModal
  }
}

// Global functions for accessing modal manager from anywhere
export const getModalManager = (): UseModalManagerReturn | null => {
  return modalManagerInstance
}

export const showModal = (id: string): void => {
  modalManagerInstance?.openModal(id)
}

export const hideModal = (id: string): void => {
  modalManagerInstance?.closeModal(id)
}

export const isAnyModalOpen = (): boolean => {
  return activeModalId !== null
}