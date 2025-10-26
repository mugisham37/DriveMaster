import Link from 'next/link'
import { getServerAuthSession } from '@/lib/auth'
import { AuthenticatedOnly, UnauthenticatedOnly } from '@/components/auth/ProtectedRoute'

export default async function TestAuthPage() {
  const session = await getServerAuthSession()
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">Server Session Status</h2>
          {session ? (
            <div>
              <p className="text-green-600">✅ Authenticated</p>
              <p>User: {session.user.handle}</p>
              <p>Email: {session.user.email}</p>
              <p>Mentor: {session.user.isMentor ? 'Yes' : 'No'}</p>
            </div>
          ) : (
            <p className="text-red-600">❌ Not authenticated</p>
          )}
        </div>
        
        <AuthenticatedOnly>
          <div className="p-4 bg-green-100 rounded">
            <h3 className="font-semibold">Authenticated Content</h3>
            <p>You are signed in! This content is protected.</p>
          </div>
        </AuthenticatedOnly>
        
        <UnauthenticatedOnly>
          <div className="p-4 bg-blue-100 rounded">
            <h3 className="font-semibold">Sign In Required</h3>
            <p>Please sign in to access protected content.</p>
            <Link href="/api/auth/signin" className="text-blue-600 underline">Sign In</Link>
          </div>
        </UnauthenticatedOnly>
      </div>
    </div>
  )
}