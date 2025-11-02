/**
 * Analytics Dashboard Page
 * 
 * Main analytics dashboard page showcasing all implemented components
 * and real-time analytics features.
 */

'use client'

import React from 'react'
import { AnalyticsDashboard } from '@/components/analytics'
import { AnalyticsProvider } from '@/contexts/AnalyticsContext'

export default function AnalyticsPage() {
  return (
    <AnalyticsProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <AnalyticsDashboard />
        </div>
      </div>
    </AnalyticsProvider>
  )
}