import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProfilePage } from '@/components/profile/ProfilePage'
import { getProfileData } from '@/lib/api/profile'

interface ProfilePageProps {
  params: { handle: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const profileData = await getProfileData(params.handle)
  
  if (!profileData) {
    return {
      title: 'Profile Not Found - Exercism'
    }
  }

  return {
    title: `${profileData.user.handle}'s Profile - Exercism`,
    description: `View ${profileData.user.handle}'s coding journey, solutions, and contributions on Exercism`,
    alternates: {
      canonical: `/profiles/${params.handle}`
    },
    openGraph: {
      title: `${profileData.user.handle}'s Profile`,
      description: `View ${profileData.user.handle}'s coding journey on Exercism`,
      images: [
        {
          url: `/profiles/${params.handle}.jpg`,
          width: 1200,
          height: 630,
          alt: `${profileData.user.handle}'s profile`
        }
      ]
    }
  }
}

export default async function Profile({ params, searchParams }: ProfilePageProps) {
  const profileData = await getProfileData(params.handle)
  
  if (!profileData) {
    notFound()
  }

  const isFirstTime = searchParams.first_time === 'true'

  return (
    <ProfilePage 
      {...profileData} 
      isFirstTime={isFirstTime}
    />
  )
}