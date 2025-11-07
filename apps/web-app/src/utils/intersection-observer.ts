/**
 * Intersection Observer Utility
 * Provides a polyfill and helper functions for IntersectionObserver API
 */

export interface IntersectionObserverOptions {
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
}

export interface IntersectionObserverCallback {
  (entries: IntersectionObserverEntry[], observer: IntersectionObserver): void
}

/**
 * Check if IntersectionObserver is supported
 */
export function isIntersectionObserverSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'IntersectionObserver' in window &&
    'IntersectionObserverEntry' in window &&
    'intersectionRatio' in (window.IntersectionObserverEntry?.prototype || {})
  )
}

/**
 * Create an IntersectionObserver with fallback
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverOptions
): IntersectionObserver | null {
  if (!isIntersectionObserverSupported()) {
    console.warn('IntersectionObserver is not supported in this browser')
    return null
  }

  return new IntersectionObserver(callback, options)
}

/**
 * Observe an element with IntersectionObserver
 */
export function observeElement(
  element: Element,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverOptions
): (() => void) | null {
  const observer = createIntersectionObserver(callback, options)
  
  if (!observer) {
    // Fallback: immediately trigger callback
    callback(
      [
        {
          target: element,
          isIntersecting: true,
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    )
    return null
  }

  observer.observe(element)

  // Return cleanup function
  return () => {
    observer.unobserve(element)
    observer.disconnect()
  }
}

/**
 * Default export for backward compatibility
 */
const intersectionObserverUtils = {
  isIntersectionObserverSupported,
  createIntersectionObserver,
  observeElement,
}

export default intersectionObserverUtils
