'use client'

import { useEffect, useRef } from 'react'
import { annotate } from 'rough-notation'
import type { RoughAnnotation } from 'rough-notation/lib/model'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

interface RoughNotationProps {
  children: React.ReactNode
  type: 'highlight' | 'underline'
  color?: string
  className?: string
}

const defaultIntersectionOptions = { rootMargin: '0px 0px -30% 0px' }

const highlightConfig = {
  type: 'highlight' as const,
  color: '#FFF176',
  strokeWidth: 6,
  iterations: 1,
  multiline: true,
  animationDuration: 500,
  padding: 8,
  roughness: 2,
}

const underlineConfig = {
  type: 'underline' as const,
  animationDuration: 500,
  color: 'rgb(112, 42, 244)',
  multiline: true,
  iterations: 1,
  padding: -4,
  roughness: 1,
}

export function RoughHighlight({ children, className = 'rough-highlight' }: Omit<RoughNotationProps, 'type'>) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const annotationRef = useRef<RoughAnnotation | null>(null)
  
  const { ref: intersectionRef, isIntersecting } = useIntersectionObserver(defaultIntersectionOptions)

  useEffect(() => {
    if (elementRef.current) {
      intersectionRef.current = elementRef.current
    }
  }, [intersectionRef])

  useEffect(() => {
    if (!isIntersecting || !elementRef.current || annotationRef.current) return

    annotationRef.current = annotate(elementRef.current, highlightConfig)
    annotationRef.current.show()
  }, [isIntersecting])

  return (
    <span ref={elementRef} className={className}>
      {children}
    </span>
  )
}

export function RoughUnderline({ children, className = 'rough-underline' }: Omit<RoughNotationProps, 'type'>) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const annotationRef = useRef<RoughAnnotation | null>(null)
  
  const { ref: intersectionRef, isIntersecting } = useIntersectionObserver(defaultIntersectionOptions)

  useEffect(() => {
    if (elementRef.current) {
      intersectionRef.current = elementRef.current
    }
  }, [intersectionRef])

  useEffect(() => {
    if (!isIntersecting || !elementRef.current || annotationRef.current) return

    annotationRef.current = annotate(elementRef.current, underlineConfig)
    annotationRef.current.show()
  }, [isIntersecting])

  return (
    <span ref={elementRef} className={className}>
      {children}
    </span>
  )
}

export function WavingHand({ children, className = 'waving-hand' }: { children: React.ReactNode; className?: string }) {
  const elementRef = useRef<HTMLSpanElement>(null)
  
  const { ref: intersectionRef, isIntersecting } = useIntersectionObserver(defaultIntersectionOptions)

  useEffect(() => {
    if (elementRef.current) {
      intersectionRef.current = elementRef.current
    }
  }, [intersectionRef])

  useEffect(() => {
    if (!isIntersecting || !elementRef.current) return

    elementRef.current.classList.add('waving-hand-animation')
  }, [isIntersecting])

  return (
    <span ref={elementRef} className={className}>
      {children}
    </span>
  )
}