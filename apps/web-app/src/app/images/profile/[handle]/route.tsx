import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

interface ProfileImageProps {
  params: { handle: string }
}

async function getProfileData(handle: string) {
  // Mock data - in real implementation, this would fetch from database
  const profiles = {
    'alice': {
      handle: 'alice',
      name: 'Alice Johnson',
      reputation: '12,450',
      flair: { name: 'Mentor', iconUrl: '/icons/mentor.svg' },
      avatarUrl: '/avatars/alice.jpg',
      badges: [
        { name: 'Functional February', iconUrl: '/badges/functional-february.svg', rarity: 'rare' },
        { name: 'Mentoring', iconUrl: '/badges/mentoring.svg', rarity: 'common' },
        { name: 'Contributor', iconUrl: '/badges/contributor.svg', rarity: 'legendary' }
      ],
      isFounder: false,
      headerTags: [
        { title: 'Super Mentor', icon: 'mentor', class: 'super-mentor' }
      ]
    }
  }

  return profiles[handle as keyof typeof profiles] || {
    handle,
    name: handle,
    reputation: '0',
    flair: null,
    avatarUrl: '/avatars/default.jpg',
    badges: [],
    isFounder: false,
    headerTags: []
  }
}

export async function GET(
  _request: NextRequest,
  { params }: ProfileImageProps
) {
  try {
    const profile = await getProfileData(params.handle)

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1a1a2e',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '32px',
              borderBottom: '1px solid #374151',
              backgroundColor: '#16213e'
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '24px',
                fontSize: '32px',
                fontWeight: 'bold'
              }}
            >
              {profile.handle.charAt(0).toUpperCase()}
            </div>

            {/* Profile Info */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, marginRight: '20px' }}>
                  @{profile.handle}
                </h1>
                <div
                  style={{
                    backgroundColor: '#fbbf24',
                    color: '#1f2937',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {profile.reputation} reputation
                </div>
              </div>
              {profile.name && (
                <div style={{ fontSize: '18px', color: '#d1d5db' }}>
                  {profile.name}
                </div>
              )}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {profile.badges.slice(0, 3).map((badge, index) => (
                <div
                  key={index}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: badge.rarity === 'legendary' ? '#fbbf24' : 
                                   badge.rarity === 'rare' ? '#a855f7' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}
                >
                  🏆
                </div>
              ))}
            </div>

            {/* Tags */}
            {profile.headerTags.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '20px' }}>
                {profile.isFounder && (
                  <div
                    style={{
                      backgroundColor: '#7c3aed',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ⭐ Founder
                  </div>
                )}
                {profile.headerTags.map((tag, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#059669',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    🎯 {tag.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contributions Chart Placeholder */}
          <div
            style={{
              backgroundColor: '#0f172a',
              padding: '16px 32px 20px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <h3 style={{ fontSize: '18px', marginBottom: '16px', margin: 0 }}>
              Contribution Activity
            </h3>
            <div
              style={{
                display: 'flex',
                gap: '4px',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                height: '100px'
              }}
            >
              {Array.from({ length: 52 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: `${Math.random() * 80 + 20}px`,
                    backgroundColor: Math.random() > 0.7 ? '#22c55e' : 
                                   Math.random() > 0.4 ? '#65a30d' : '#374151',
                    borderRadius: '2px'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Exercism Branding */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              opacity: 0.3,
              fontSize: '48px'
            }}
          >
            💻
          </div>
        </div>
      ),
      {
        width: 800,
        height: 600,
      }
    )
  } catch (error) {
    console.error('Profile image generation error:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}