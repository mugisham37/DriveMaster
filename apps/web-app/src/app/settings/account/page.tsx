import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { 
  EmailForm,
  PasswordForm,
  HandleForm,
  PhotoForm,
  PronounsForm,
  TokenForm,
  DeleteAccountButton,
  ResetAccountButton
} from '@/components/settings'

export const metadata: Metadata = {
  title: 'Account Settings - Exercism',
  description: 'Manage your account security and personal information'
}

async function getAccountData(userId: number) {
  // TODO: Fetch actual account data from database
  
  const mockData = {
    email: 'user@example.com',
    handle: 'johndoe',
    avatar_url: 'https://avatars.githubusercontent.com/u/1234567?v=4',
    has_avatar: true,
    pronoun_parts: {
      subject: 'he',
      object: 'him', 
      possessive: 'his'
    },
    auth_token: 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234'
  }

  return mockData
}

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/settings/account')
  }

  const accountData = await getAccountData(session.user.id)

  return (
    <div id="page-settings-account" className="page-settings">
      <div className="lg-container">
        <article>
          <h1 className="text-h2 mb-8">Account Settings</h1>
          
          <section id="photo-form" className="mb-12">
            <PhotoForm
              user={{
                avatar_url: accountData.avatar_url,
                has_avatar: accountData.has_avatar,
                handle: accountData.handle
              }}
              links={{
                update: '/api/users/' + session.user.id,
                delete: '/api/users/' + session.user.id + '/avatar'
              }}
            />
          </section>

          <section id="email-form" className="mb-12">
            <EmailForm
              email={accountData.email}
              links={{
                update: '/api/settings/sudo-update'
              }}
            />
          </section>

          <section id="handle-form" className="mb-12">
            <HandleForm
              handle={accountData.handle}
              links={{
                update: '/api/settings/sudo-update'
              }}
            />
          </section>

          <section id="password-form" className="mb-12">
            <PasswordForm
              links={{
                update: '/api/settings/sudo-update'
              }}
            />
          </section>

          <section id="pronouns-form" className="mb-12">
            <PronounsForm
              handle={accountData.handle}
              pronoun_parts={accountData.pronoun_parts}
              links={{
                update: '/api/settings',
                info: '/docs/using/settings/pronouns'
              }}
            />
          </section>

          <section id="token-form" className="mb-12">
            <TokenForm
              token={accountData.auth_token}
              links={{
                reset: '/api/settings/auth-token/reset',
                info: '/docs/using/solving-exercises/working-locally'
              }}
            />
          </section>

          <section id="reset-account-button" className="mb-12">
            <ResetAccountButton
              handle={accountData.handle}
              links={{
                reset: '/api/settings/reset-account'
              }}
            />
          </section>

          <section id="delete-account-button" className="mb-12">
            <DeleteAccountButton
              handle={accountData.handle}
              links={{
                delete: '/api/settings/delete-account'
              }}
            />
          </section>
        </article>
      </div>
    </div>
  )
}