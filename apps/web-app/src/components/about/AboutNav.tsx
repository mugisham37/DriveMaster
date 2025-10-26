'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { assembleClassNames } from '@/utils/assemble-classnames'

interface AboutNavProps {
  activeTab?: 'about' | 'impact' | 'team' | 'testimonials' | 'hiring'
}

export function AboutNav({ activeTab }: AboutNavProps) {
  const pathname = usePathname()
  
  const navItems = [
    { key: 'about', label: 'About', href: '/about' },
    { key: 'team', label: 'Team', href: '/about/team' },
    { key: 'impact', label: 'Impact', href: '/about/impact' },
    { key: 'testimonials', label: 'Testimonials', href: '/about/testimonials' },
    { key: 'hiring', label: 'Hiring', href: '/about/hiring' }
  ]

  return (
    <nav className="flex items-center justify-center mb-8">
      <div className="flex bg-backgroundColorA rounded-8 p-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.key || pathname === item.href
          
          return (
            <Link
              key={item.key}
              href={item.href}
              className={assembleClassNames(
                'px-16 py-8 rounded-6 text-16 font-medium transition-colors',
                isActive
                  ? 'bg-prominentLinkColor text-white'
                  : 'text-textColor2 hover:text-textColor1 hover:bg-backgroundColorB'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}