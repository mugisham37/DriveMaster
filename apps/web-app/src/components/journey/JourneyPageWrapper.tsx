'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Loading } from '@/components/common/Loading'

// Dynamically import the JourneyPage component to avoid SSR issues
const JourneyPage = dynamic(() => import('./JourneyPage'), {
  loading: () => <Loading />,
  ssr: false
})

export interface Category {
  id: string
  title: string
  icon: string
  path: string
  request: {
    endpoint: string
    query: Record<string, any>
    options: Record<string, any>
  }
}

interface JourneyPageWrapperProps {
  defaultCategory: string
  categories: Category[]
}

export function JourneyPageWrapper({ defaultCategory, categories }: JourneyPageWrapperProps) {
  return (
    <JourneyPage 
      defaultCategory={defaultCategory as any}
      categories={categories}
    />
  )
}