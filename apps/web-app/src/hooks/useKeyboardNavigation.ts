import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardNavigationOptions {
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onEnter?: () => void
  onEscape?: () => void
  onTab?: () => void
  onShiftTab?: () => void
  onHome?: () => void
  onEnd?: () => void
  onPageUp?: () => void
  onPageDown?: () => void
  preventDefault?: boolean
  stopPropagation?: boolean
  enabled?: boolean
}

export function useKeyboardNavigation(
  options: KeyboardNavigationOptions,
  dependencies: React.DependencyList = []
) {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onTab,
    onShiftTab,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault = true,
    stopPropagation = false,
    enabled = true
  } = options

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return

    let handled = false

    switch (e.key) {
      case 'ArrowUp':
        if (onArrowUp) {
          onArrowUp()
          handled = true
        }
        break
      case 'ArrowDown':
        if (onArrowDown) {
          onArrowDown()
          handled = true
        }
        break
      case 'ArrowLeft':
        if (onArrowLeft) {
          onArrowLeft()
          handled = true
        }
        break
      case 'ArrowRight':
        if (onArrowRight) {
          onArrowRight()
          handled = true
        }
        break
      case 'Enter':
        if (onEnter) {
          onEnter()
          handled = true
        }
        break
      case 'Escape':
        if (onEscape) {
          onEscape()
          handled = true
        }
        break
      case 'Tab':
        if (e.shiftKey && onShiftTab) {
          onShiftTab()
          handled = true
        } else if (!e.shiftKey && onTab) {
          onTab()
          handled = true
        }
        break
      case 'Home':
        if (onHome) {
          onHome()
          handled = true
        }
        break
      case 'End':
        if (onEnd) {
          onEnd()
          handled = true
        }
        break
      case 'PageUp':
        if (onPageUp) {
          onPageUp()
          handled = true
        }
        break
      case 'PageDown':
        if (onPageDown) {
          onPageDown()
          handled = true
        }
        break
    }

    if (handled) {
      if (preventDefault) {
        e.preventDefault()
      }
      if (stopPropagation) {
        e.stopPropagation()
      }
    }

    return handled
  }, [
    enabled,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onTab,
    onShiftTab,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault,
    stopPropagation
  ])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [handleKeyDown, enabled])

  return handleKeyDown
}

// Hook for managing focus within a container
export function useFocusManagement() {
  const containerRef = useRef<HTMLElement>(null)

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors))
  }, [])

  const focusFirst = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[0]?.focus()
    }
  }, [getFocusableElements])

  const focusLast = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[elements.length - 1]?.focus()
    }
  }, [getFocusableElements])

  const focusNext = useCallback(() => {
    const elements = getFocusableElements()
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement)
    
    if (currentIndex >= 0 && currentIndex < elements.length - 1) {
      elements[currentIndex + 1]?.focus()
    } else if (elements.length > 0) {
      elements[0]?.focus() // Wrap to first
    }
  }, [getFocusableElements])

  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements()
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement)
    
    if (currentIndex > 0) {
      elements[currentIndex - 1]?.focus()
    } else if (elements.length > 0) {
      elements[elements.length - 1]?.focus() // Wrap to last
    }
  }, [getFocusableElements])

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab') return

    const elements = getFocusableElements()
    if (elements.length === 0) return

    const firstElement = elements[0]
    const lastElement = elements[elements.length - 1]

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }
  }, [getFocusableElements])

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    trapFocus,
    getFocusableElements
  }
}

// Hook for managing roving tabindex (for lists, grids, etc.)
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  initialIndex: number = 0
) {
  const activeIndexRef = useRef(initialIndex)

  const updateTabIndex = useCallback(() => {
    items.forEach((item, index) => {
      if (index === activeIndexRef.current) {
        item.setAttribute('tabindex', '0')
      } else {
        item.setAttribute('tabindex', '-1')
      }
    })
  }, [items])

  const setActiveIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      activeIndexRef.current = index
      updateTabIndex()
      items[index]?.focus()
    }
  }, [items, updateTabIndex])

  const moveNext = useCallback(() => {
    const nextIndex = (activeIndexRef.current + 1) % items.length
    setActiveIndex(nextIndex)
  }, [items.length, setActiveIndex])

  const movePrevious = useCallback(() => {
    const prevIndex = activeIndexRef.current === 0 
      ? items.length - 1 
      : activeIndexRef.current - 1
    setActiveIndex(prevIndex)
  }, [items.length, setActiveIndex])

  const moveFirst = useCallback(() => {
    setActiveIndex(0)
  }, [setActiveIndex])

  const moveLast = useCallback(() => {
    setActiveIndex(items.length - 1)
  }, [items.length, setActiveIndex])

  // Initialize tabindex on mount and when items change
  useEffect(() => {
    updateTabIndex()
  }, [updateTabIndex])

  return {
    activeIndex: activeIndexRef.current,
    setActiveIndex,
    moveNext,
    movePrevious,
    moveFirst,
    moveLast
  }
}