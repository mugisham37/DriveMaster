import { Metadata } from 'next'
import { Suspense } from 'react'
import { Layout } from '@/components/layout/Layout'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { UnsubscribeForm } from '@/components/settings/UnsubscribeForm'

export const metadata: Metadata = {
  title: 'Unsubscribe - Exercism',
  description: 'Manage your email preferences and unsubscribe from Exercism emails',
}

interface UnsubscribePageProps {
  searchParams: {
    email?: string
    token?: string
    type?: string
  }
}

export default function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  return (
    <Layout>
      <div className="lg-container py-24">
        <div className="max-w-2xl mx-auto text-center">
          <GraphicalIcon 
            icon="email" 
            className="w-16 h-16 mx-auto mb-6 text-gray-400" 
          />
          
          <h1 className="text-h1 mb-6">Unsubscribe from Emails</h1>
          
          <p className="text-p-large text-gray-600 dark:text-gray-300 mb-8">
            We&apos;re sorry to see you go! You can unsubscribe from specific types of emails 
            or manage your preferences below.
          </p>

          <Suspense fallback={<div>Loading...</div>}>
            <UnsubscribeForm 
              email={searchParams.email}
              token={searchParams.token}
              type={searchParams.type}
            />
          </Suspense>

          <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
            <h3 className="font-semibold mb-3">What you&apos;ll miss:</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>• Updates about new features and improvements</li>
              <li>• Notifications about mentoring discussions</li>
              <li>• Weekly progress summaries</li>
              <li>• Community highlights and success stories</li>
              <li>• Important account and security notifications</li>
            </ul>
          </div>

          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Note: Some critical notifications (like security alerts) cannot be disabled for account safety.
          </div>
        </div>
      </div>
    </Layout>
  )
}