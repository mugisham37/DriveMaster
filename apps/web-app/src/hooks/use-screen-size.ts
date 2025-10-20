import { useState, useEffect } from 'react'

// Default Tailwind lg breakpoint
const lgBreakpoint = 1024

function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export type UseWindowSizeResult = {
  isBelowLgWidth: boolean
  windowSize: Record<'width' | 'height', number>
}

export function useWindowSize(): UseWindowSizeResult {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = debounce(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }, 300)

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return { windowSize, isBelowLgWidth: windowSize.width <= lgBreakpoint }
}
