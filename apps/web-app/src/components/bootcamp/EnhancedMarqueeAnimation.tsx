'use client'

import { useEffect, useRef } from 'react'

interface EnhancedMarqueeAnimationProps {
  children: React.ReactNode
  className?: string
  velocityScale?: number
  minSpeed?: number
  maxSpeed?: number
}

export function EnhancedMarqueeAnimation({ 
  children, 
  className = 'scrolling-testimonials',
  velocityScale = 0.1,
  minSpeed = 1,
  maxSpeed = 5
}: EnhancedMarqueeAnimationProps) {
  const marqueeRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef({ current: minSpeed, max: maxSpeed, min: minSpeed })
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (!marqueeRef.current || !containerRef.current) return

    const marqueeElement = marqueeRef.current
    const container = containerRef.current

    // Get the width of the marquee content
    const marqueeWidth = marqueeElement.scrollWidth

    // Clone items for seamless looping (preserve exact cloning logic from original)
    const clonedItems = marqueeElement.innerHTML
    marqueeElement.innerHTML = clonedItems + clonedItems

    let animationPosition = 0
    let lastTimestamp: number | null = null

    const animateMarquee = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp
      }

      const elapsed = timestamp - lastTimestamp
      lastTimestamp = timestamp

      animationPosition += elapsed * speedRef.current.current * velocityScale

      if (animationPosition >= marqueeWidth) {
        animationPosition = animationPosition % marqueeWidth
      }

      marqueeElement.style.transform = `translateX(${-animationPosition}px)`

      animationRef.current = requestAnimationFrame(animateMarquee)
    }

    // Start animation
    animationRef.current = requestAnimationFrame(animateMarquee)

    // Speed animation function
    const animateSpeed = (targetSpeed: number, duration: number = 500) => {
      const startSpeed = speedRef.current.current
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Linear interpolation
        speedRef.current.current = startSpeed + (targetSpeed - startSpeed) * progress

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      animate()
    }

    const handleMouseEnter = () => {
      animateSpeed(speedRef.current.max)
    }

    const handleMouseLeave = () => {
      animateSpeed(speedRef.current.min)
    }

    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      container.removeEventListener('mouseenter', handleMouseEnter)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [velocityScale, minSpeed, maxSpeed])

  return (
    <div ref={containerRef} className={className}>
      <ul ref={marqueeRef}>
        {children}
      </ul>
    </div>
  )
}