'use client'

import { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import Link from 'next/link'

interface Integration {
  connected: boolean
  username?: string | null
  lastSync?: string | null
  serverId?: string | null
  workspaceName?: string | null
  channelId?: string | null
}

interface IntegrationsData {
  github: Integration
  discord: Integration
  slack: Integration
}

interface IntegrationsSettingsProps {
  integrations: IntegrationsData
  links: {
    connectGithub: string
    disconnectGithub: string
    connectDiscord: string
    disconnectDiscord: string
    connectSlack: string
    disconnectSlack: string
  }
}

export function IntegrationsSettings({ integrations, links }: IntegrationsSettingsProps) {
  const [currentIntegrations, setCurrentIntegrations] = useState(integrations)

  const { submit: connectGithub, isSubmitting: isConnectingGithub } = useFormSubmission({
    endpoint: links.connectGithub,
    method: 'POST',
    onSuccess: (data?: Record<string, unknown>) => {
      if (data?.username && typeof data.username === 'string') {
        setCurrentIntegrations(prev => ({
          ...prev,
          github: { ...prev.github, connected: true, username: data.username }
        }))
      }
    }
  })

  const { submit: disconnectGithub, isSubmitting: isDisconnectingGithub } = useFormSubmission({
    endpoint: links.disconnectGithub,
    method: 'DELETE',
    onSuccess: () => {
      setCurrentIntegrations(prev => ({
        ...prev,
        github: { connected: false, username: null, lastSync: null }
      }))
    }
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-8">
      {/* GitHub Integration */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
              <GraphicalIcon icon="github" className="w-6 h-6 text-white dark:text-gray-900" />
            </div>
            <div>
              <h2 className="text-h3 font-semibold">GitHub</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sync your solutions to GitHub repositories
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentIntegrations.github.connected 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {currentIntegrations.github.connected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        {currentIntegrations.github.connected ? (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Username:</span>
                  <div className="text-gray-600 dark:text-gray-300">
                    @{currentIntegrations.github.username}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Last Sync:</span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {currentIntegrations.github.lastSync ? formatDate(currentIntegrations.github.lastSync) : 'Never'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/settings/github-syncer"
                className="btn-s btn-primary"
              >
                Manage Sync
              </Link>
              
              <FormButton
                onClick={() => disconnectGithub({})}
                isLoading={isDisconnectingGithub}
                className="btn-s btn-destructive"
              >
                Disconnect
              </FormButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Connect your GitHub account to automatically sync your Exercism solutions to GitHub repositories. 
              This helps you build a portfolio of your coding progress.
            </p>
            
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Automatic solution syncing</li>
              <li>• Organized by track and exercise</li>
              <li>• Maintains your commit history</li>
              <li>• Public or private repository options</li>
            </ul>

            <FormButton
              onClick={() => connectGithub({})}
              isLoading={isConnectingGithub}
              className="btn-m btn-primary"
            >
              Connect GitHub
            </FormButton>
          </div>
        )}
      </section>

      {/* Discord Integration */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
              <GraphicalIcon icon="discord" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-h3 font-semibold">Discord</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get notifications in Discord servers
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentIntegrations.discord.connected 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {currentIntegrations.discord.connected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Connect Discord to receive notifications about mentoring discussions, 
            exercise completions, and community updates directly in your Discord servers.
          </p>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <GraphicalIcon icon="info" className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Coming Soon:</strong> Discord integration is currently in development. 
                Join our Discord server to stay updated on the release.
              </div>
            </div>
          </div>

          <Link
            href="https://discord.gg/exercism"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-m btn-default"
          >
            Join Discord Server
          </Link>
        </div>
      </section>

      {/* Slack Integration */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <GraphicalIcon icon="slack" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-h3 font-semibold">Slack</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive updates in your Slack workspace
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            currentIntegrations.slack.connected 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {currentIntegrations.slack.connected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Connect Slack to receive notifications about your Exercism progress, 
            mentoring activities, and team updates in your Slack workspace.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <GraphicalIcon icon="info" className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Enterprise Feature:</strong> Slack integration is available for teams and organizations. 
                Contact us to learn more about Exercism for Teams.
              </div>
            </div>
          </div>

          <Link
            href="/contact"
            className="btn-m btn-default"
          >
            Contact Sales
          </Link>
        </div>
      </section>

      {/* Webhooks Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-h2 mb-4">Custom Webhooks</h2>
        
        <p className="text-p-base text-gray-600 dark:text-gray-300 mb-6">
          Set up custom webhooks to receive real-time notifications about your Exercism activity 
          in your own applications and services.
        </p>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Available Events</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• Exercise completed</li>
            <li>• Solution published</li>
            <li>• Mentoring discussion started</li>
            <li>• Badge earned</li>
            <li>• Track joined</li>
          </ul>
        </div>

        <Link
          href="/settings/webhooks"
          className="btn-m btn-default"
        >
          Manage Webhooks
        </Link>
      </section>
    </div>
  )
}