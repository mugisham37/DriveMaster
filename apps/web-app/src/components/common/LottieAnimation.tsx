'use client'

import { useEffect, useRef } from 'react'
import lottie, { AnimationItem } from 'lottie-web'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

interface LottieAnimationProps {
  animationData?: object
  animationPath?: string
  loop?: boolean
  autoplay?: boolean
  className?: string
  id?: string | undefined
  triggerOnIntersection?: boolean
  intersectionOptions?: {
    rootMargin?: string
    threshold?: number
  }
}

export function LottieAnimation({
  animationData,
  animationPath,
  loop = false,
  autoplay = true,
  className = '',
  id,
  triggerOnIntersection = true,
  intersectionOptions = { rootMargin: '0px 0px -30% 0px' }
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<AnimationItem | null>(null)
  
  const { ref: intersectionRef, isIntersecting } = useIntersectionObserver({
    ...intersectionOptions,
    triggerOnce: true
  })

  // Combine refs
  const setRefs = (element: HTMLDivElement | null) => {
    containerRef.current = element
    if (triggerOnIntersection && element) {
      (intersectionRef as React.MutableRefObject<Element | null>).current = element
    }
  }

  useEffect(() => {
    if (!containerRef.current) return
    
    // Only start animation if not using intersection observer or if intersecting
    if (triggerOnIntersection && !isIntersecting) return

    // Clean up previous animation
    if (animationRef.current) {
      animationRef.current.destroy()
    }

    // Load animation data
    const loadAnimation = async () => {
      let data = animationData

      if (!data && animationPath) {
        try {
          const response = await fetch(animationPath)
          data = await response.json()
        } catch (error) {
          console.error('Failed to load Lottie animation:', error)
          return
        }
      }

      if (!data) {
        console.error('No animation data provided')
        return
      }

      animationRef.current = lottie.loadAnimation({
        container: containerRef.current!,
        renderer: 'svg',
        loop,
        autoplay,
        animationData: data,
      })
    }

    loadAnimation()

    return () => {
      if (animationRef.current) {
        animationRef.current.destroy()
        animationRef.current = null
      }
    }
  }, [animationData, animationPath, loop, autoplay, isIntersecting, triggerOnIntersection])

  return (
    <div 
      ref={setRefs}
      className={className}
      id={id}
    />
  )
}

// Specific components for bootcamp animations
export function ArrowAnimation({ 
  id, 
  className = 'arrow-animation' 
}: { 
  id?: string
  className?: string 
}) {
  // Determine animation data based on id (preserve exact logic from original)
  const getAnimationPath = (animationId?: string) => {
    switch (animationId) {
      case 'rhodri':
      case 'jiki':
        return '/lottiefiles/arrow-3.json'
      default:
        return '/lottiefiles/arrow-animation.json'
    }
  }

  return (
    <LottieAnimation
      animationPath={getAnimationPath(id)}
      loop={false}
      autoplay={true}
      className={className}
      id={id || undefined}
      triggerOnIntersection={true}
      intersectionOptions={{ rootMargin: '0px 0px -30% 0px' }} // Preserve exact rootMargin
    />
  )
}

export function HamsterAnimation({ 
  className = 'hamster-animation' 
}: { 
  className?: string 
}) {
  return (
    <LottieAnimation
      animationPath="/lottiefiles/hamster.json"
      loop={true}
      autoplay={true}
      className={className}
      triggerOnIntersection={true}
      intersectionOptions={{ rootMargin: '0px 0px -30% 0px' }}
    />
  )
}
