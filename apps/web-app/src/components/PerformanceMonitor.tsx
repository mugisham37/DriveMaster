'use client'

import { useEffect } from 'react'
import { reportWebVitals, sendToAnalytics } from '@/lib/performance/web-vitals'

export function PerformanceMonitor() {
  useEffect(() => {
    // Initialize performance monitoring
    reportWebVitals(sendToAnalytics)
  }, [])

  // This component doesn't render anything visible
  return null
}