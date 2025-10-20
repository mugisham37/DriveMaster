import React, { useEffect, useRef, useCallback } from 'react'

// Hook for managing ARIA live regions
export function useLiveRegion() {
  const liveRegionRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority)
      liveRegionRef.current.textContent = message
      
      // Clear the message after a short delay to allow for re-announcements
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = ''
        }
      }, 1000)
    }
  }, [])

  const LiveRegion = useCallback(() => (
    React.createElement('div', {
      ref: liveRegionRef,
      'aria-live': 'polite',
      'aria-atomic': 'true',
      className: 'sr-only'
    })
  ), [])

  return { announce, LiveRegion }
}

// Hook for managing focus restoration
export function useFocusRestore() {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus()
    }
  }, [])

  return { saveFocus, restoreFocus }
}

// Hook for managing skip links
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLDivElement>(null)

  const addSkipLink = useCallback((targetId: string, label: string) => {
    if (!skipLinksRef.current) return

    const skipLink = document.createElement('a')
    skipLink.href = `#${targetId}`
    skipLink.textContent = label
    skipLink.className = 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50'
    
    skipLinksRef.current.appendChild(skipLink)
  }, [])

  const SkipLinks = useCallback(() => (
    React.createElement('div', {
      ref: skipLinksRef,
      className: 'skip-links'
    })
  ), [])

  return { addSkipLink, SkipLinks }
}

// Hook for managing reduced motion preferences
export function useReducedMotion() {
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mediaQuery.matches

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion.current
}

// Hook for managing high contrast preferences
export function useHighContrast() {
  const prefersHighContrast = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    prefersHighContrast.current = mediaQuery.matches

    const handleChange = (e: MediaQueryListEvent) => {
      prefersHighContrast.current = e.matches
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersHighContrast.current
}

// Hook for managing screen reader detection
export function useScreenReader() {
  const isScreenReader = useRef(false)

  useEffect(() => {
    // Check for common screen reader indicators
    const checkScreenReader = () => {
      // Check for screen reader specific CSS media queries
      const screenReaderQuery = window.matchMedia('(prefers-reduced-motion: reduce) and (pointer: none)')
      
      // Check for NVDA, JAWS, or other screen reader user agents
      const userAgent = navigator.userAgent.toLowerCase()
      const hasScreenReaderUA = /nvda|jaws|dragon|voiceover/.test(userAgent)
      
      // Check for high contrast mode (often used with screen readers)
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
      
      isScreenReader.current = screenReaderQuery.matches || hasScreenReaderUA || highContrastQuery.matches
    }

    checkScreenReader()
    
    // Listen for changes in media queries
    const screenReaderQuery = window.matchMedia('(prefers-reduced-motion: reduce) and (pointer: none)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    
    screenReaderQuery.addEventListener('change', checkScreenReader)
    highContrastQuery.addEventListener('change', checkScreenReader)
    
    return () => {
      screenReaderQuery.removeEventListener('change', checkScreenReader)
      highContrastQuery.removeEventListener('change', checkScreenReader)
    }
  }, [])

  return isScreenReader.current
}

// Hook for managing ARIA descriptions
export function useAriaDescription() {
  const descriptionId = useRef(`description-${Math.random().toString(36).substring(2, 11)}`)

  const Description = useCallback(({ children }: { children: React.ReactNode }) => (
    React.createElement('div', {
      id: descriptionId.current,
      className: 'sr-only'
    }, children)
  ), [])

  return {
    descriptionId: descriptionId.current,
    Description
  }
}

// Utility function to generate unique IDs for accessibility
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`
}

// Utility function to manage ARIA attributes
export function getAriaAttributes(options: {
  label?: string
  labelledBy?: string
  describedBy?: string
  expanded?: boolean
  selected?: boolean
  checked?: boolean
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  live?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: string
  busy?: boolean
}) {
  const attributes: Record<string, unknown> = {}

  if (options.label) attributes['aria-label'] = options.label
  if (options.labelledBy) attributes['aria-labelledby'] = options.labelledBy
  if (options.describedBy) attributes['aria-describedby'] = options.describedBy
  if (options.expanded !== undefined) attributes['aria-expanded'] = options.expanded
  if (options.selected !== undefined) attributes['aria-selected'] = options.selected
  if (options.checked !== undefined) attributes['aria-checked'] = options.checked
  if (options.disabled !== undefined) attributes['aria-disabled'] = options.disabled
  if (options.required !== undefined) attributes['aria-required'] = options.required
  if (options.invalid !== undefined) attributes['aria-invalid'] = options.invalid
  if (options.live) attributes['aria-live'] = options.live
  if (options.atomic !== undefined) attributes['aria-atomic'] = options.atomic
  if (options.relevant) attributes['aria-relevant'] = options.relevant
  if (options.busy !== undefined) attributes['aria-busy'] = options.busy

  return attributes
}