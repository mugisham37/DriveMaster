import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/settings'

export const metadata: Metadata = {
  title: 'Profile Settings - Exercism',
  description: 'Manage your profile information and social links'
}

async function getProfileData() {
  // TODO: Fetch actual profile data from database
  // This would typically fetch user's profile information
  
  const mockUser = {
    name: 'John Doe',
    location: 'San Francisco, CA',
    bio: 'Full-stack developer passionate about clean code and mentoring.',
    seniority: 'intermediate'
  }

  const mockProfile = {
    twitter: 'johndoe',
    github: 'johndoe',
    linkedin: 'johndoe'
  }

  return {
    user: mockUser,
    profile: mockProfile
  }
}

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/settings/profile')
  }

  const profileData = await getProfileData()

  return (
    <div id="page-settings-profile" className="page-settings">
      <div className="lg-container">
        <article>
          <ProfileForm
            user={profileData.user}
            profile={profileData.profile}
            links={{
              update: '/api/settings'
            }}
          />
        </article>
      </div>
    </div>
  )
}