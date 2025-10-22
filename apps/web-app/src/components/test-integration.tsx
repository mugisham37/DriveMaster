// Integration test file to verify migrated components work
import React from 'react'
import { FavoritesList } from './favorites-list'
import { GithubSyncerWidget } from './github-syncer-widget'
import { ImpactChart, ImpactMap, ImpactStat } from './impact'

// Test data
const testTracks = [
  { slug: 'javascript', title: 'JavaScript', iconUrl: '/icons/js.svg', numSolutions: 100 }
]

const testRequest = {
  endpoint: '/api/favorites',
  query: { criteria: '', trackSlug: '', page: 1 }
}

const testSyncObj = {
  endpoint: '/api/github-syncer/sync',
  body: JSON.stringify({ type: 'solution' }),
  type: 'solution' as const
}

const testMetrics = [
  {
    id: '1',
    type: 'sign_up_metric',
    coordinates: [40.7128, -74.0060] as [number, number],
    user: { handle: 'testuser', avatarUrl: '/avatar.jpg' },
    track: { title: 'JavaScript', iconUrl: '/icons/js.svg' }
  }
]

// Integration test component
export function TestIntegration() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Component Integration Test</h1>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Favorites List</h2>
        <FavoritesList 
          tracks={testTracks}
          request={testRequest}
          isUserInsider={true}
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">GitHub Syncer Widget</h2>
        <GithubSyncerWidget
          syncer={{ enabled: true, syncOnIterationCreation: true }}
          links={{ githubSyncerSettings: '/settings/github-syncer' }}
          sync={testSyncObj}
        />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Impact Components</h2>
        <div className="space-y-4">
          <ImpactChart data={{ usersPerMonth: '{"2024-01": 1000}', milestones: '[]' }} />
          <ImpactMap initialMetrics={testMetrics} />
          <ImpactStat metricType="sign_up_metric" initialValue={1000} />
        </div>
      </section>
    </div>
  )
}