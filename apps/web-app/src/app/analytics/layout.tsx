/**
 * Analytics Layout
 * 
 * Layout component for analytics pages with navigation and context providers.
 */

'use client'

import React from 'react'
import { AnalyticsProvider } from '@/contexts/AnalyticsContext'
import { AnalyticsNavigation } from '@/components/analytics'

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AnalyticsProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 p-6">
          <AnalyticsNavigation variant="sidebar" />
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </AnalyticsProvider>
  )
}