import React, { useState, createContext, useContext } from 'react'

export interface GithubSyncerSettings {
  enabled: boolean
  syncOnIterationCreation: boolean
  repositoryName?: string
  repositoryUrl?: string
  commitMessageTemplate?: string
  pathTemplate?: string
  processingMethod?: 'commit' | 'pull_request'
  mainBranchName?: string
  syncExerciseFiles?: boolean
  repoFullName?: string
}

interface GitHubSyncerFormProps {
  settings: GithubSyncerSettings
  onSave: (settings: GithubSyncerSettings) => void
}

interface GitHubSyncerContextType {
  links: {
    self: string
    update: string
    disconnect: string
    enableCommentsOnAllSolutions: string
    disableCommentsOnAllSolutions: string
    settings: string
    syncTrack: string
    syncEverything: string
    connectToGithub: string
  }
  isUserInsider: boolean
  syncer: GithubSyncerSettings
  defaultCommitMessageTemplate: string
  defaultPathTemplate: string
  tracks: Array<{ slug: string; title: string }>
  isSyncingEnabled: boolean
  setIsSyncingEnabled: (enabled: boolean) => void
  setIsUserConnected: (connected: boolean) => void
}

export const GitHubSyncerContext = createContext<GitHubSyncerContextType | undefined>(undefined)

export const useGitHubSyncerContext = () => {
  const context = useContext(GitHubSyncerContext)
  if (!context) {
    throw new Error('useGitHubSyncerContext must be used within a GitHubSyncerProvider')
  }
  return context
}

export function GitHubSyncerForm({ settings, onSave }: GitHubSyncerFormProps): React.JSX.Element {
  const [formData, setFormData] = useState<GithubSyncerSettings>(settings)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="github-syncer-form">
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
          />
          Enable GitHub sync
        </label>
      </div>

      {formData.enabled && (
        <>
          <div className="form-group">
            <label>
              Repository Name:
              <input
                type="text"
                value={formData.repositoryName || ''}
                onChange={(e) => setFormData({ ...formData, repositoryName: e.target.value })}
                placeholder="my-exercism-solutions"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.syncOnIterationCreation}
                onChange={(e) => setFormData({ ...formData, syncOnIterationCreation: e.target.checked })}
              />
              Sync automatically on iteration creation
            </label>
          </div>
        </>
      )}

      <button type="submit" className="btn-primary">
        Save Settings
      </button>
    </form>
  )
}

export default GitHubSyncerForm