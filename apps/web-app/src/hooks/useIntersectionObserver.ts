'use client'

import { useEffect, useRef, useState } from 'react'

export interface IntersectionObserverOptions {
  threshold?: number | number[]
  rootMargin?: string
  root?: Element | null
  triggerOnce?: boolean
}

export interface UseIntersectionObserverReturn {
  ref: React.RefObject<Element | null>
  isIntersecting: boolean
  entry: IntersectionObserverEntry | undefined
}

/**
 * Custom hook for intersection observer with exact behavior preservation from original implementation
 * Default rootMargin matches the original: '0px 0px -30% 0px' (element must be in upper 2/3 of viewport)
 */
export function useIntersectionObserver(
  options: IntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    threshold = 0,
    rootMargin = '0px 0px -30% 0px', // Default from original implementation
    root = null,
    triggerOnce = true, // Most animations in original trigger once
  } = options

  const ref = useRef<Element | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry) {
          setIsIntersecting(entry.isIntersecting)
          setEntry(entry)

          // If triggerOnce is true and element is intersecting, disconnect observer
          if (triggerOnce && entry.isIntersecting) {
            observer.unobserve(element)
          }
        }
      },
      {
        threshold,
        rootMargin,
        root,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, root, triggerOnce])

  return { ref, isIntersecting, entry }
}

/**
 * Hook for fade-in animations with exact timing from original
 */
export function useFadeInAnimation(options?: IntersectionObserverOptions) {
  const { ref, isIntersecting } = useIntersectionObserver(options)
  
  return {
    ref,
    className: isIntersecting ? 'animate-fade-in' : 'opacity-0',
    style: {
      transition: 'opacity 500ms ease-in-out', // Match original animation duration
    }
  }
}

/**
 * Hook for slide-up animations with exact timing from original
 */
export function useSlideUpAnimation(options?: IntersectionObserverOptions) {
  const { ref, isIntersecting } = useIntersectionObserver(options)
  
  return {
    ref,
    className: isIntersecting ? 'animate-slide-up' : 'translate-y-8 opacity-0',
    style: {
      transition: 'transform 500ms ease-out, opacity 500ms ease-out', // Match original timing
    }
  }
}

/**
 * Hook for scale animations with exact timing from original
 */
export function useScaleAnimation(options?: IntersectionObserverOptions) {
  const { ref, isIntersecting } = useIntersectionObserver(options)
  
  return {
    ref,
    className: isIntersecting ? 'animate-scale-in' : 'scale-95 opacity-0',
    style: {
      transition: 'transform 500ms ease-out, opacity 500ms ease-out', // Match original timing
    }
  }
}

/**
 * Hook for waving hand animation (specific to bootcamp section)
 */
export function useWavingHandAnimation(options?: IntersectionObserverOptions) {
  const { ref, isIntersecting } = useIntersectionObserver(options)
  
  return {
    ref,
    className: isIntersecting ? 'waving-hand-animation' : '',
  }
}

/**
 * Hook for navigation intersection behavior (specific to bootcamp nav)
 */
export function useNavIntersection() {
  const taglineRef = useRef<Element>(null)
  const videoContainerRef = useRef<Element>(null)
  const rockSolidRef = useRef<Element>(null)
  const bootcampRef = useRef<Element>(null)
  
  const [navState, setNavState] = useState({
    isSticky: false,
    opacity: 0,
    onPurple: false,
  })

  useEffect(() => {
    const taglineElement = taglineRef.current
    const videoContainerElement = videoContainerRef.current
    const rockSolidElement = rockSolidRef.current
    const bootcampElement = bootcampRef.current

    if (!taglineElement || !videoContainerElement || !rockSolidElement || !bootcampElement) {
      return
    }

    let isRockSolidIntersecting = false

    const intersectionCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        switch (entry.target) {
          case taglineElement:
            setNavState(prev => ({
              ...prev,
              isSticky: !(entry.isIntersecting || isRockSolidIntersecting)
            }))
            break
          case videoContainerElement:
            setNavState(prev => ({
              ...prev,
              opacity: (entry.isIntersecting && !isRockSolidIntersecting) ? 0 : 1
            }))
            break
          case rockSolidElement:
            isRockSolidIntersecting = entry.isIntersecting
            break
        }
      })
    }

    const bootcampObserverCb = (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0]
      if (entry) {
        setNavState(prev => ({
          ...prev,
          onPurple: entry.isIntersecting
        }))
      }
    }

    // 90% of the bootcamp section is visible (preserve exact rootMargin from original)
    const bootcampObserver = new IntersectionObserver(bootcampObserverCb, {
      rootMargin: '0px 0px -90% 0px',
    })

    const navObserver = new IntersectionObserver(intersectionCallback)

    navObserver.observe(taglineElement)
    navObserver.observe(videoContainerElement)
    navObserver.observe(rockSolidElement)
    bootcampObserver.observe(bootcampElement)

    return () => {
      navObserver.disconnect()
      bootcampObserver.disconnect()
    }
  }, [])

  return {
    taglineRef,
    videoContainerRef,
    rockSolidRef,
    bootcampRef,
    navState,
  }
}