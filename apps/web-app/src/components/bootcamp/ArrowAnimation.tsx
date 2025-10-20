'use client'

import { useEffect, useRef } from 'react'
import lottie from 'lottie-web'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

interface ArrowAnimationProps {
  id?: string
  className?: string
}

function getAnimationData(id?: string) {
  switch (id) {
    case 'rhodri':
    case 'jiki':
      return '/lottiefiles/arrow-3.json'
    default:
      return '/lottiefiles/arrow-animation.json'
  }
}

export function ArrowAnimation({ id, className = 'arrow-animation' }: ArrowAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { ref: intersectionRef, isIntersecting } = useIntersectionObserver({
    rootMargin: '0px 0px -30% 0px', // Element must be in upper 2/3 of viewport
    triggerOnce: true
  })

  useEffect(() => {
    if (containerRef.current) {
      intersectionRef.current = containerRef.current
    }
  }, [intersectionRef])

  useEffect(() => {
    if (!isIntersecting || !containerRef.current) return

    const loadAnimation = async () => {
      try {
        const animationPath = getAnimationData(id)
        const response = await fetch(animationPath)
        const animationData = await response.json()

        lottie.loadAnimation({
          container: containerRef.current!,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData,
        })
      } catch (error) {
        console.error('Failed to load arrow animation:', error)
      }
    }

    loadAnimation()
  }, [isIntersecting, id])

  return (
    <div 
      ref={containerRef}
      id={id}
      className={className}
    />
  )
}