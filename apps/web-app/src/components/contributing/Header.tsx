'use client'

import React from 'react'
import Link from 'next/link'
import { GraphicalIcon } from '../common/GraphicalIcon'

type TabType = 'dashboard' | 'contributors' | 'tasks'

interface ContributingHeaderProps {
  selectedTab: TabType
  tasksSize?: number
  contributorsSize?: number
  className?: string
}

export function ContributingHeader({
  selectedTab,
  tasksSize = 0,
  contributorsSize = 0,
  className = ''
}: ContributingHeaderProps): React.JSX.Element {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num)
  }

  const getTabClass = (tab: TabType): string => {
    return `c-tab-2 ${tab === selectedTab ? 'selected' : ''}`
  }

  const getScrollIntoView = (tab: TabType) => {
    return tab === selectedTab ? { scrollIntoView: 'x' } : {}
  }

  return (
    <nav className={`c-contributing-header c-header-with-bg ${className}`}>
      {/* Top Section */}
      <div className="lg-container top-container">
        <div className="content">
          <GraphicalIcon icon="contributing-header" />
          <h1>Let's build the best coding education platform, together</h1>
          <p>
            Exercism is an{' '}
            <Link href="/about" className="text-linkColor">
              open source, not-for-profit project
            </Link>
            {' '}built by people from all backgrounds. With over one hundred dedicated maintainers and thousands of contributors, our goal is to create the best, free, code learning platform on the web.
          </p>
        </div>
        <GraphicalIcon 
          icon="contributing-header" 
          category="graphics" 
          className="hidden md:block" 
        />
        <div className="decorations hidden lg:block"></div>
      </div>

      {/* Navigation Section */}
      <div className="lg-container nav-container" data-scrollable-container="true">
        <div className="tabs">
          <Link
            href="/contributing"
            className={getTabClass('dashboard')}
            data-scroll-into-view={getScrollIntoView('dashboard')}
          >
            <GraphicalIcon icon="overview" />
            <span>Getting Started</span>
          </Link>

          <Link
            href="/contributing/tasks"
            className={getTabClass('tasks')}
            data-scroll-into-view={getScrollIntoView('tasks')}
          >
            <GraphicalIcon icon="tasks" />
            <span>Explore tasks</span>
            <span className="count">{formatNumber(tasksSize)}</span>
          </Link>

          <Link
            href="/contributing/contributors?period=week"
            className={getTabClass('contributors')}
            data-scroll-into-view={getScrollIntoView('contributors')}
          >
            <GraphicalIcon icon="contributors" />
            <span>Contributors</span>
            <span className="count">{formatNumber(contributorsSize)}</span>
          </Link>
        </div>

        <Link
          href="/docs/building"
          className="c-tab-2 guides"
        >
          <GraphicalIcon icon="guides" />
          <span>Contributing Help</span>
        </Link>
      </div>
    </nav>
  )
}

export default ContributingHeader