import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { APICliSettings } from '@/components/settings/APICliSettings'

export const metadata: Metadata = {
  title: 'API & CLI Settings - Exercism',
  description: 'Manage your API tokens and CLI configuration'
}

async function getAPISettings() {
  // TODO: Fetch actual API settings from database
  return {
    apiToken: 'exercism_api_token_...',
    cliVersion: '3.2.0',
    lastUsed: '2024-01-15T10:30:00Z',
    downloadUrl: 'https://github.com/exercism/cli/releases/latest'
  }
}

export default async function APICliSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/settings/api-cli')
  }

  const apiSettings = await getAPISettings()

  return (
    <div id="page-settings-api-cli" className="page-settings">
      <div className="lg-container">
        <article>
          <h1 className="text-h1 mb-8">API & CLI Settings</h1>
          
          <APICliSettings 
            apiSettings={apiSettings}
            links={{
              resetToken: '/api/settings/auth-token/reset'
            }}
          />
        </article>
      </div>
    </div>
  )
}