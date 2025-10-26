import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

interface SolutionImageProps {
  params: { uuid: string }
}

async function getSolutionData(uuid: string) {
  // Mock data - in real implementation, this would fetch from database
  const solutions = {
    'abc123': {
      uuid: 'abc123',
      user: {
        handle: 'alice',
        avatarUrl: '/avatars/alice.jpg'
      },
      exercise: {
        title: 'Hello World',
        iconUrl: '/exercises/hello-world.svg'
      },
      track: {
        title: 'JavaScript',
        iconUrl: '/tracks/javascript.svg'
      },
      code: `function hello() {
  return "Hello, World!";
}

module.exports = { hello };`,
      language: 'javascript'
    }
  }

  return solutions[uuid as keyof typeof solutions] || {
    uuid,
    user: { handle: 'unknown', avatarUrl: '/avatars/default.jpg' },
    exercise: { title: 'Unknown Exercise', iconUrl: '/exercises/default.svg' },
    track: { title: 'Unknown Track', iconUrl: '/tracks/default.svg' },
    code: '// Solution not found',
    language: 'text'
  }
}

export async function GET(
  _request: NextRequest,
  { params }: SolutionImageProps
) {
  try {
    const solution = await getSolutionData(params.uuid)

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
            fontFamily: 'Monaco, Consolas, monospace',
            overflow: 'hidden'
          }}
        >
          {/* Code Area */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              backgroundColor: '#0f172a',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Exercism Logo Watermark */}
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

            {/* Code Content */}
            <pre
              style={{
                margin: 0,
                fontSize: '16px',
                lineHeight: '1.5',
                color: '#e5e7eb',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {solution.code}
            </pre>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              backgroundColor: '#16213e',
              borderTop: '1px solid #374151'
            }}
          >
            {/* User Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {solution.user.handle.charAt(0).toUpperCase()}
            </div>

            {/* Solution Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              <span style={{ color: 'white' }}>
                Solution by {solution.user.handle}
              </span>
              <span style={{ margin: '0 8px', color: '#9ca3af' }}>
                to
              </span>
              <span style={{ color: 'white' }}>
                {solution.exercise.title}
              </span>
              <span style={{ margin: '0 8px', color: '#9ca3af' }}>
                on Exercism&apos;s
              </span>
              <span style={{ color: 'white' }}>
                {solution.track.title} Track
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 800,
        height: 600,
      }
    )
  } catch (error) {
    console.error('Solution image generation error:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}