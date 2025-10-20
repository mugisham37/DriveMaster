'use client'

import { useState } from 'react'
import { CopyToClipboardButton } from '@/components/common/CopyToClipboardButton'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import Link from 'next/link'

interface APISettings {
  apiToken: string
  cliVersion: string
  lastUsed: string
  downloadUrl: string
}

interface APICliSettingsProps {
  apiSettings: APISettings
  links: {
    resetToken: string
  }
}

export function APICliSettings({ apiSettings, links }: APICliSettingsProps) {
  const [showToken, setShowToken] = useState(false)
  const [currentToken, setCurrentToken] = useState(apiSettings.apiToken)

  const { submit: resetToken, isSubmitting } = useFormSubmission({
    endpoint: links.resetToken,
    method: 'POST',
    onSuccess: (data) => {
      setCurrentToken(data.token)
    },
    successMessage: 'API token has been reset successfully'
  })

  const handleResetToken = async () => {
    if (confirm('Are you sure you want to reset your API token? This will invalidate your current token and you\'ll need to reconfigure the CLI.')) {
      await resetToken({})
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const maskedToken = currentToken.replace(/(.{8}).*(.{4})/, '$1....$2')

  return (
    <div className="space-y-8">
      {/* API Token Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-h2 mb-4">API Token</h2>
        
        <p className="text-p-base text-gray-600 dark:text-gray-300 mb-6">
          Your API token is used to authenticate with the Exercism CLI and API. 
          Keep this token secure and don't share it with others.
        </p>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Current Token:</label>
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-sm text-linkColor hover:underline"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
          
          <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border">
            {showToken ? currentToken : maskedToken}
          </div>
          
          {showToken && (
            <div className="mt-3">
              <CopyToClipboardButton text={currentToken} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span>Last used: {formatDate(apiSettings.lastUsed)}</span>
        </div>

        <FormButton
          onClick={handleResetToken}
          isLoading={isSubmitting}
          className="btn-m btn-destructive"
        >
          Reset API Token
        </FormButton>
      </section>

      {/* CLI Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-h2 mb-4">Exercism CLI</h2>
        
        <p className="text-p-base text-gray-600 dark:text-gray-300 mb-6">
          The Exercism CLI allows you to download exercises, submit solutions, and interact with Exercism from your terminal.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Current Version</h3>
            <div className="font-mono text-lg">{apiSettings.cliVersion}</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Status</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600 dark:text-green-400">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <GraphicalIcon icon="terminal" className="w-5 h-5" />
            Quick Setup
          </h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <strong>1. Download the CLI:</strong>
              <div className="mt-1">
                <Link
                  href={apiSettings.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-linkColor hover:underline"
                >
                  Download latest version
                </Link>
              </div>
            </div>
            
            <div>
              <strong>2. Configure with your token:</strong>
              <div className="mt-1 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                exercism configure --token={showToken ? currentToken : maskedToken}
              </div>
            </div>
            
            <div>
              <strong>3. Download an exercise:</strong>
              <div className="mt-1 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                exercism download --exercise=hello-world --track=javascript
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={apiSettings.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-m btn-primary"
          >
            Download CLI
          </Link>
          
          <Link
            href="https://exercism.org/docs/using/solving-exercises/working-locally"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-m btn-default"
          >
            View Documentation
          </Link>
        </div>
      </section>

      {/* API Documentation */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-h2 mb-4">API Documentation</h2>
        
        <p className="text-p-base text-gray-600 dark:text-gray-300 mb-4">
          Use the Exercism API to build integrations and tools. All API requests require authentication using your API token.
        </p>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Base URL</h3>
          <div className="font-mono text-sm">https://exercism.org/api/v2</div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">Authentication</h3>
          <div className="font-mono text-sm">Authorization: Bearer {showToken ? currentToken : maskedToken}</div>
        </div>

        <Link
          href="https://exercism.org/docs/using/api"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-m btn-default"
        >
          View API Documentation
        </Link>
      </section>
    </div>
  )
}