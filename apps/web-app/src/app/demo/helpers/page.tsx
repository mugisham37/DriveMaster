'use client'

import React from 'react'
import { emailButtonTo, EmailButton } from '@/lib/email/button-helper'
import { getCompletionMessage, useCompletionText } from '@/lib/user-tracks/completion-text'
import ExternalLink from '@/components/common/ExternalLink'
import FlashMessages from '@/components/common/FlashMessages'
import { useFlashMessageManager } from '@/components/common/FlashMessages'

/**
 * Demo page showing migrated helper functionality
 * This demonstrates the Ruby helpers that have been migrated to Next.js
 */

export default function HelpersDemo() {
  const { 
    messages, 
    addSuccess, 
    addError, 
    addNotice, 
    clearMessages 
  } = useFlashMessageManager()

  const [completionPercentage, setCompletionPercentage] = React.useState(45)
  const completionText = useCompletionText(completionPercentage)

  const handleAddFlashMessage = (type: 'success' | 'error' | 'notice') => {
    const messages = {
      success: 'Operation completed successfully!',
      error: 'An error occurred while processing your request.',
      notice: 'Please note this important information.'
    }
    
    if (type === 'success') addSuccess(messages.success)
    if (type === 'error') addError(messages.error)
    if (type === 'notice') addNotice(messages.notice)
  }

  const emailButtonHtml = emailButtonTo('Get Started', 'https://exercism.org/tracks')

  return (
    <div className="lg-container py-8">
      <h1 className="text-h1 mb-8">Migrated Ruby Helpers Demo</h1>
      
      {/* Flash Messages Demo */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">Flash Messages (from flash_helper.rb)</h2>
        <div className="mb-4">
          <button 
            onClick={() => handleAddFlashMessage('success')}
            className="bg-green-500 text-white px-4 py-2 rounded mr-2"
          >
            Add Success Message
          </button>
          <button 
            onClick={() => handleAddFlashMessage('error')}
            className="bg-red-500 text-white px-4 py-2 rounded mr-2"
          >
            Add Error Message
          </button>
          <button 
            onClick={() => handleAddFlashMessage('notice')}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Add Notice Message
          </button>
          <button 
            onClick={clearMessages}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Clear Messages
          </button>
        </div>
        <FlashMessages messages={messages} />
      </section>

      {/* External Link Demo */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">External Links (from links_helper.rb)</h2>
        <div className="space-y-2">
          <div>
            <ExternalLink href="https://exercism.org" className="text-blue-600 underline">
              Visit Exercism (with icon)
            </ExternalLink>
          </div>
          <div>
            <ExternalLink 
              href="https://github.com/exercism" 
              className="text-blue-600 underline"
              showIcon={false}
            >
              Visit GitHub (no icon)
            </ExternalLink>
          </div>
        </div>
      </section>

      {/* User Track Completion Text Demo */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">User Track Completion Text (from user_tracks_helper.rb)</h2>
        <div className="mb-4">
          <label className="block mb-2">
            Completion Percentage: {completionPercentage}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={completionPercentage}
            onChange={(e) => setCompletionPercentage(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="p-4 bg-gray-100 rounded">
          <p><strong>Range:</strong> {completionText.range}</p>
          <p><strong>Message:</strong> {completionText.message}</p>
          <p><strong>Is Valid:</strong> {completionText.isValid ? 'Yes' : 'No'}</p>
        </div>
      </section>

      {/* Email Button Demo */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">Email Buttons (from email_helper.rb)</h2>
        
        <div className="mb-6">
          <h3 className="text-h3 mb-2">React Component Version:</h3>
          <EmailButton 
            text="Join Exercism" 
            href="https://exercism.org/tracks"
          />
        </div>

        <div className="mb-6">
          <h3 className="text-h3 mb-2">HTML String Version (for email templates):</h3>
          <div 
            className="border p-4 bg-gray-50"
            dangerouslySetInnerHTML={{ __html: emailButtonHtml }}
          />
        </div>

        <div>
          <h3 className="text-h3 mb-2">Custom Styled Version:</h3>
          <EmailButton 
            text="Custom Button" 
            href="https://exercism.org"
            backgroundColor="#10b981"
            borderColor="#059669"
            textColor="#ffffff"
          />
        </div>
      </section>

      {/* Integration Examples */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">Integration Examples</h2>
        
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h3 className="text-h3 mb-2">Track Progress with Flash Message</h3>
            <button
              onClick={() => {
                const message = getCompletionMessage(completionPercentage)
                addSuccess(`Track Progress: ${message}`)
              }}
              className="bg-purple-500 text-white px-4 py-2 rounded"
            >
              Show Progress Message
            </button>
          </div>

          <div className="p-4 border rounded">
            <h3 className="text-h3 mb-2">External Link with Flash Confirmation</h3>
            <ExternalLink 
              href="https://exercism.org/donate"
              className="text-blue-600 underline"
              onClick={() => addNotice('You are being redirected to an external site.')}
            >
              Donate to Exercism
            </ExternalLink>
          </div>
        </div>
      </section>

      <div className="mt-12 p-4 bg-green-50 border border-green-200 rounded">
        <h3 className="text-h3 mb-2 text-green-800">Migration Status</h3>
        <p className="text-green-700">
          ✅ All identified missing Ruby helper functionality has been successfully migrated to Next.js components and utilities.
        </p>
        <ul className="mt-2 text-green-700 list-disc list-inside">
          <li>Flash Messages: Fully functional with React hooks</li>
          <li>External Links: Component with security attributes</li>
          <li>User Track Completion: Percentage-based text generation</li>
          <li>Email Buttons: Both React component and HTML string versions</li>
        </ul>
      </div>
    </div>
  )
}