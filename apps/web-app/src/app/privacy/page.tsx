'use client'

/**
 * Privacy Dashboard Page - GDPR Compliance Interface
 * 
 * This page demonstrates the complete GDPR compliance implementation
 * including all Task 8 components and functionality.
 */

import React from 'react'
import { GDPRProvider } from '@/contexts/GDPRContext'
import { GDPRDashboard } from '@/components/gdpr'

export default function PrivacyPage() {
  return (
    <GDPRProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <GDPRDashboard />
        </div>
      </div>
    </GDPRProvider>
  )
}