'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface ScreenSizeContextType {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
  height: number
}

const ScreenSizeContext = createContext<ScreenSizeContextType>({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  width: 1024,
  height: 768,
})

export function useScreenSize(): ScreenSizeContextType {
  return useContext(ScreenSizeContext)
}

interface ScreenSizeWrapperProps {
  children: React.ReactNode
}

export function ScreenSizeWrapper({ children }: ScreenSizeWrapperProps): JSX.Element {
  const [screenSize, setScreenSize] = useState<ScreenSizeContextType>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
    height: 768,
  })

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setScreenSize({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      })
    }

    // Set initial size
    updateScreenSize()

    // Add event listener
    window.addEventListener('resize', updateScreenSize)

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return (
    <ScreenSizeContext.Provider value={screenSize}>
      {children}
    </ScreenSizeContext.Provider>
  )
}

export default ScreenSizeWrapper