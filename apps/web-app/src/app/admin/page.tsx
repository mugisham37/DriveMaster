import { Metadata } from 'next'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Exercism',
  description: 'Administrative interface for managing Exercism platform',
}

export default async function AdminPage() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin')
  }

  // Check if user has admin privileges (using isInsider as proxy for admin)
  if (!session.user.isInsider) {
    redirect('/dashboard')
  }

  return (
    <div className="admin-page">
      <div className="lg-container">
        <header className="page-header mb-8">
          <h1 className="text-h1 mb-4">Admin Dashboard</h1>
          <p className="text-p-large text-textColor6">
            Manage tracks, exercises, users, and platform settings.
          </p>
        </header>

        <AdminDashboard />
      </div>
    </div>
  )
}