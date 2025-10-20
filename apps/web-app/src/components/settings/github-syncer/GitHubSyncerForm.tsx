import React, { useState } from 'react'

export interface GithubSyncerSettings {
  enabled: boolean
  syncOnIterationCreation: boolean
  repositoryName?: string
  repositoryUrl?: string
}

interface GitHubSyncerFormProps {
  settings: GithubSyncerSettings
  onSave: (settings: GithubSyncerSettings) => void
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