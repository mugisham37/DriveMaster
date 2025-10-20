import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'

export type GithubSyncerSettings = {
  enabled: boolean
  syncOnIterationCreation: boolean
  repositoryName?: string
  repositoryUrl?: string
}

export type SyncObj = {
  endpoint: string
  body: string
  type: 'solution' | 'iteration'
}

export type GithubSolutionSyncerWidgetProps = {
  syncer: GithubSyncerSettings | null
  links: {
    githubSyncerSettings: string
  }
  sync: SyncObj
}

// Mini Advert Component
const MiniAdvert = ({ settingsLink }: { settingsLink: string }) => {
  return (
    <div className="github-syncer-widget mini-advert">
      <div className="content">
        <h3>Backup your solutions to GitHub</h3>
        <p>Automatically sync your solutions to your GitHub repository.</p>
        <a href={settingsLink} className="btn-primary btn-s">
          Set up GitHub sync
        </a>
      </div>
    </div>
  )
}

// Paused Sync Component
const PausedSync = ({ settingsLink }: { settingsLink: string }) => {
  return (
    <div className="github-syncer-widget paused-sync">
      <div className="content">
        <h3>GitHub sync is disabled</h3>
        <p>Your syncer is currently disabled.</p>
        <a href={settingsLink} className="btn-secondary btn-s">
          Visit settings to enable it
        </a>
      </div>
    </div>
  )
}

// Active Automatic Sync Component
const ActiveAutomaticSync = ({ sync }: { sync: SyncObj }) => {
  const [isLoading, setIsLoading] = useState(false)
  
  const { submit } = useFormSubmission({
    endpoint: sync.endpoint,
    method: 'PATCH',
    onSuccess: () => {
      setIsLoading(false)
    },
    onError: () => {
      setIsLoading(false)
    },
  })

  const handleManualSync = async () => {
    setIsLoading(true)
    try {
      const body = JSON.parse(sync.body)
      await submit(body)
    } catch (error) {
      console.error('Manual sync failed:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="github-syncer-widget active-automatic">
      <div className="content">
        <h3>Auto-backup enabled</h3>
        <p>Your solution will auto-backup to GitHub. If it doesn't for some reason, please click this button to manually start the backup.</p>
        <button
          onClick={handleManualSync}
          disabled={isLoading}
          className="btn-secondary btn-s"
        >
          {isLoading ? 'Syncing...' : 'Manual backup'}
        </button>
      </div>
    </div>
  )
}

// Active Manual Sync Component
const ActiveManualSync = ({ sync }: { sync: SyncObj }) => {
  const [isLoading, setIsLoading] = useState(false)
  
  const { submit } = useFormSubmission({
    endpoint: sync.endpoint,
    method: 'PATCH',
    onSuccess: () => {
      setIsLoading(false)
    },
    onError: () => {
      setIsLoading(false)
    },
  })

  const handleManualSync = async () => {
    setIsLoading(true)
    try {
      const body = JSON.parse(sync.body)
      await submit(body)
    } catch (error) {
      console.error('Manual sync failed:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="github-syncer-widget active-manual">
      <div className="content">
        <h3>Manual backup</h3>
        <p>You have automatic syncs disabled. Click to back up your solution.</p>
        <button
          onClick={handleManualSync}
          disabled={isLoading}
          className="btn-primary btn-s"
        >
          {isLoading ? 'Backing up...' : 'Backup to GitHub'}
        </button>
      </div>
    </div>
  )
}

// Main Widget Component
export default function GithubSolutionSyncerWidget({
  syncer,
  links,
  sync,
}: GithubSolutionSyncerWidgetProps): JSX.Element {
  if (!syncer) return <MiniAdvert settingsLink={links.githubSyncerSettings} />

  if (!syncer.enabled)
    return <PausedSync settingsLink={links.githubSyncerSettings} />

  if (syncer.syncOnIterationCreation) return <ActiveAutomaticSync sync={sync} />

  return <ActiveManualSync sync={sync} />
}