'use client'

import { useEffect, useRef, useState } from 'react'
import lottie, { AnimationItem } from 'lottie-web'

interface HamsterAnimationProps {
  className?: string
}

export function HamsterAnimation({ className = '' }: HamsterAnimationProps) {
  const hamsterContainerRef = useRef<HTMLDivElement>(null)
  const smokeContainerRef = useRef<HTMLDivElement>(null)
  const scrollingTestimonialsRef = useRef<HTMLDivElement>(null)
  
  const [hamsterAnimation, setHamsterAnimation] = useState<AnimationItem | null>(null)
  const hamsterSpeedRef = useRef({ value: 1 })
  const smokeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const smokeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const TRANSITION_DURATION = 500
  const SMOKE_DELAY = 200
  const SMOKE_INTERVAL = 50

  useEffect(() => {
    const loadHamsterAnimation = async () => {
      if (!hamsterContainerRef.current) return

      try {
        // Load the hamster animation JSON
        const response = await fetch('/lottiefiles/hamster.json')
        const hamsterJSON = await response.json()
        
        const animation = lottie.loadAnimation({
          container: hamsterContainerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: hamsterJSON,
        })

        setHamsterAnimation(animation)
      } catch (error) {
        console.error('Failed to load hamster animation:', error)
      }
    }

    loadHamsterAnimation()

    return () => {
      if (hamsterAnimation) {
        hamsterAnimation.destroy()
      }
    }
  }, [hamsterAnimation])

  useEffect(() => {
    if (!smokeContainerRef.current) return

    const smokeContainer = smokeContainerRef.current
    
    // Style the smoke container
    Object.assign(smokeContainer.style, {
      position: 'absolute',
      right: '55px',
      top: '-200px',
      width: '100px',
      height: '150px',
      margin: '50px auto',
      overflow: 'visible',
      pointerEvents: 'none',
    })
  }, [])

  const clearTimers = () => {
    if (smokeTimeoutRef.current) {
      clearTimeout(smokeTimeoutRef.current)
      smokeTimeoutRef.current = null
    }
    if (smokeIntervalRef.current) {
      clearInterval(smokeIntervalRef.current)
      smokeIntervalRef.current = null
    }
  }

  const createPuff = () => {
    if (!smokeContainerRef.current) return

    const puff = document.createElement('div')

    const finalScale = (1.5 + Math.random() * 3).toFixed(2)
    const finalX = -350 - Math.random() * 100
    const finalY = -90 - Math.random() * 30
    const duration = (1.8 + Math.random() * 0.6).toFixed(2)
    const durationMs = parseFloat(duration) * 1000

    Object.assign(puff.style, {
      position: 'absolute',
      bottom: '0',
      left: '50%',
      width: '30px',
      height: '30px',
      background:
        'radial-gradient(circle, rgba(238,238,238,0.8) 0%, rgba(170,170,170,0.5) 100%)',
      borderRadius: '50%',
      opacity: '0',
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
    })

    puff.animate(
      [
        { opacity: '0', transform: 'translate(-50%, 0) scale(0.5)' },
        { offset: 0.1, opacity: '0.2' },
        {
          opacity: '0',
          transform: `translate(${finalX}%, ${finalY}px) scale(${finalScale})`,
        },
      ],
      { duration: durationMs, easing: 'ease-out', fill: 'forwards' }
    )

    smokeContainerRef.current.appendChild(puff)
    setTimeout(() => puff.remove(), durationMs)
  }

  useEffect(() => {
    const scrollingTestimonials = scrollingTestimonialsRef.current
    if (!scrollingTestimonials || !hamsterAnimation) return

    const startSmokeMachine = () => setInterval(createPuff, SMOKE_INTERVAL)

    const animateSpeed = (targetSpeed: number) => {
      if (!hamsterAnimation) return

      const startSpeed = hamsterSpeedRef.current.value
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1)
        
        // Linear interpolation
        const currentSpeed = startSpeed + (targetSpeed - startSpeed) * progress
        hamsterSpeedRef.current.value = currentSpeed
        
        hamsterAnimation.setSpeed(currentSpeed)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      animate()
    }

    const handleMouseEnter = () => {
      animateSpeed(3)

      smokeTimeoutRef.current = setTimeout(() => {
        smokeIntervalRef.current = startSmokeMachine()
      }, SMOKE_DELAY)
    }

    const handleMouseLeave = () => {
      animateSpeed(1)
      clearTimers()
    }

    scrollingTestimonials.addEventListener('mouseenter', handleMouseEnter)
    scrollingTestimonials.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      scrollingTestimonials.removeEventListener('mouseenter', handleMouseEnter)
      scrollingTestimonials.removeEventListener('mouseleave', handleMouseLeave)
      clearTimers()
    }
  }, [hamsterAnimation])

  return (
    <div ref={scrollingTestimonialsRef} className={`scrolling-testimonials ${className}`}>
      <div 
        ref={hamsterContainerRef}
        id="hamster-animation-container"
        className="hamster"
      />
      <div 
        ref={smokeContainerRef}
        id="smoke-container"
      />
    </div>
  )
}