import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings'

export const metadata: Metadata = {
  title: 'Integrations - Settings - Exercism',
  description: 'Connect your Exercism account with external services and tools'
}

async function getIntegrationsData() {
  // TODO: Fetch actual integrations data from database
  return {
    github: {
      connected: false,
      username: null,
      lastSync: null
    },
    discord: {
      connected: false,
      username: null,
      serverId: null
    },
    slack: {
      connected: false,
      workspaceName: null,
      channelId: null
    }
  }
}

export default async function IntegrationsSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/settings/integrations')
  }

  const integrations = await getIntegrationsData()

  return (
    <div id="page-settings-integrations" className="page-settings">
      <div className="lg-container">
        <article>
          <h1 className="text-h1 mb-8">Integrations</h1>
          
          <IntegrationsSettings 
            integrations={integrations}
            links={{
              connectGithub: '/api/settings/integrations/github/connect',
              disconnectGithub: '/api/settings/integrations/github/disconnect',
              connectDiscord: '/api/settings/integrations/discord/connect',
              disconnectDiscord: '/api/settings/integrations/discord/disconnect',
              connectSlack: '/api/settings/integrations/slack/connect',
              disconnectSlack: '/api/settings/integrations/slack/disconnect'
            }}
          />
        </article>
      </div>
    </div>
  )
}