'use client'

import React, { useState } from 'react'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export function DiscountBar() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3">
      <div className="lg-container flex items-center justify-between">
        <div className="flex items-center">
          <GraphicalIcon icon="sparkle" className="w-5 h-5 mr-3" />
          <span className="font-semibold">
            Limited Time: Save 30% on all courses! Use code LEARN30
          </span>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Close discount banner"
        >
          <GraphicalIcon icon="close" className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}