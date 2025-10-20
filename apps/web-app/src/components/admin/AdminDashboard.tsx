'use client'

import React, { useState } from 'react'
import { Tab } from '@/components/common/Tab'
import { TrackManagement } from './TrackManagement'
import { ExerciseRepresentations } from './ExerciseRepresentations'
import { SiteUpdates } from './SiteUpdates'
import { UserManagement } from './UserManagement'
import { SystemStats } from './SystemStats'

type AdminTab = 'overview' | 'tracks' | 'exercises' | 'representations' | 'users' | 'updates'

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview' },
    { id: 'tracks' as AdminTab, label: 'Tracks' },
    { id: 'exercises' as AdminTab, label: 'Exercises' },
    { id: 'representations' as AdminTab, label: 'Representations' },
    { id: 'users' as AdminTab, label: 'Users' },
    { id: 'updates' as AdminTab, label: 'Site Updates' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <SystemStats />
      case 'tracks':
        return <TrackManagement />
      case 'exercises':
        return <div className="p-8 text-center text-textColor6">Exercise management coming soon...</div>
      case 'representations':
        return <ExerciseRepresentations />
      case 'users':
        return <UserManagement />
      case 'updates':
        return <SiteUpdates />
      default:
        return <SystemStats />
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-tabs mb-8">
        <div className="flex items-center gap-1 border-b border-borderColor7">
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Tab>
          ))}
        </div>
      </div>

      <div className="admin-content">
        {renderTabContent()}
      </div>
    </div>
  )
}