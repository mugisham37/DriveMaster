'use client'

/**
 * OAuth Components Examples
 * 
 * Demonstrates usage of OAuth buttons and provider management
 * For testing and development purposes
 */

import React, { useState } from 'react'
import { 
  OAuthButton, 
  OAuthButtonGroup, 
  OAuthProviderManager,
  useOAuthProviderStatus 
} from '../index'
import type { OAuthProviderType, OAuthError } from '@/types/auth-service'

// ============================================================================
// Individual OAuth Button Examples
// ============================================================================

const IndividualButtonExamples: React.FC = () => {
  const [results, setResults] = useState<string[]>([])
  
  const handleSuccess = (result: { user: any; isNewUser: boolean }, provider: string) => {
    setResults(prev => [...prev, `✅ ${provider} success: ${result.isNewUser ? 'New user' : 'Existing user'}`])
  }
  
  const handleError = (error: OAuthError, provider: string) => {
    setResults(prev => [...prev, `❌ ${provider} error: ${error.message}`])
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Individual OAuth Buttons</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Default Style */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Default Style</h4>
          <OAuthButton
            provider="google"
            mode="signin"
            flow="popup"
            onSuccess={(result) => handleSuccess(result, 'Google')}
            onError={(error) => handleError(error, 'Google')}
          />
          <OAuthButton
            provider="github"
            mode="signin"
            flow="popup"
            onSuccess={(result) => handleSuccess(result, 'GitHub')}
            onError={(error) => handleError(error, 'GitHub')}
          />
        </div>
        
        {/* Outline Style */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Outline Style</h4>
          <OAuthButton
            provider="apple"
            mode="signin"
            flow="popup"
            variant="outline"
            onSuccess={(result) => handleSuccess(result, 'Apple')}
            onError={(error) => handleError(error, 'Apple')}
          />
          <OAuthButton
            provider="facebook"
            mode="signin"
            flow="popup"
            variant="outline"
            onSuccess={(result) => handleSuccess(result, 'Facebook')}
            onError={(error) => handleError(error, 'Facebook')}
          />
        </div>
        
        {/* Small Size */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Small Size</h4>
          <OAuthButton
            provider="microsoft"
            mode="signin"
            flow="popup"
            size="sm"
            onSuccess={(result) => handleSuccess(result, 'Microsoft')}
            onError={(error) => handleError(error, 'Microsoft')}
          />
        </div>
        
        {/* Custom Content */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Custom Content</h4>
          <OAuthButton
            provider="google"
            mode="signin"
            flow="popup"
            showIcon={false}
            onSuccess={(result) => handleSuccess(result, 'Google Custom')}
            onError={(error) => handleError(error, 'Google Custom')}
          >
            Continue with Google
          </OAuthButton>
        </div>
      </div>
      
      {/* Results */}
      {results.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">Results:</h4>
          <div className="space-y-1 text-sm">
            {results.map((result, index) => (
              <div key={index} className="font-mono">{result}</div>
            ))}
          </div>
          <button
            onClick={() => setResults([])}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            Clear Results
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// OAuth Button Group Examples
// ============================================================================

const ButtonGroupExamples: React.FC = () => {
  const [results, setResults] = useState<string[]>([])
  
  const handleSuccess = (result: { user: any; isNewUser: boolean; provider: OAuthProviderType }) => {
    setResults(prev => [...prev, `✅ ${result.provider} group success: ${result.isNewUser ? 'New user' : 'Existing user'}`])
  }
  
  const handleError = (error: OAuthError, provider: OAuthProviderType) => {
    setResults(prev => [...prev, `❌ ${provider} group error: ${error.message}`])
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">OAuth Button Groups</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vertical Layout */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">Vertical Layout</h4>
          <OAuthButtonGroup
            providers={['google', 'github', 'apple']}
            mode="signin"
            flow="popup"
            layout="vertical"
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
        
        {/* Horizontal Layout */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">Horizontal Layout</h4>
          <OAuthButtonGroup
            providers={['google', 'github']}
            mode="signin"
            flow="popup"
            layout="horizontal"
            size="sm"
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
        
        {/* Grid Layout */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">Grid Layout</h4>
          <OAuthButtonGroup
            providers={['google', 'github', 'apple', 'facebook']}
            mode="signin"
            flow="popup"
            layout="grid"
            size="sm"
            showIcons={false}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
        
        {/* All Providers */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">All Providers</h4>
          <OAuthButtonGroup
            providers={['google', 'apple', 'facebook', 'github', 'microsoft']}
            mode="signin"
            flow="popup"
            layout="vertical"
            variant="outline"
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </div>
      
      {/* Results */}
      {results.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">Group Results:</h4>
          <div className="space-y-1 text-sm">
            {results.map((result, index) => (
              <div key={index} className="font-mono">{result}</div>
            ))}
          </div>
          <button
            onClick={() => setResults([])}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            Clear Results
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Provider Status Hook Example
// ============================================================================

const ProviderStatusExample: React.FC = () => {
  const googleStatus = useOAuthProviderStatus('google')
  const githubStatus = useOAuthProviderStatus('github')
  const appleStatus = useOAuthProviderStatus('apple')
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Provider Status Hook</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: 'Google', status: googleStatus },
          { name: 'GitHub', status: githubStatus },
          { name: 'Apple', status: appleStatus }
        ].map(({ name, status }) => (
          <div key={name} className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">{name}</h4>
            {status.loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : status.error ? (
              <div className="text-sm text-red-600">Error: {status.error.message}</div>
            ) : status.status ? (
              <div className="space-y-1 text-sm">
                <div className={`flex items-center ${status.status.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status.status.enabled ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                  {status.status.enabled ? 'Enabled' : 'Disabled'}
                </div>
                <div className={`flex items-center ${status.status.available ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status.status.available ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                  {status.status.available ? 'Available' : 'Unavailable'}
                </div>
                <div className={`flex items-center ${status.status.linked ? 'text-blue-600' : 'text-gray-400'}`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${status.status.linked ? 'bg-blue-400' : 'bg-gray-300'}`}></span>
                  {status.status.linked ? 'Linked' : 'Not linked'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No status available</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Examples Component
// ============================================================================

export const OAuthExamples: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'buttons' | 'groups' | 'status' | 'manager'>('buttons')
  
  const tabs = [
    { id: 'buttons', label: 'Individual Buttons' },
    { id: 'groups', label: 'Button Groups' },
    { id: 'status', label: 'Provider Status' },
    { id: 'manager', label: 'Provider Manager' }
  ] as const
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">OAuth Components Examples</h1>
        <p className="text-gray-600">
          Interactive examples of OAuth buttons, groups, and provider management components.
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'buttons' && <IndividualButtonExamples />}
        {activeTab === 'groups' && <ButtonGroupExamples />}
        {activeTab === 'status' && <ProviderStatusExample />}
        {activeTab === 'manager' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">OAuth Provider Manager</h3>
            <p className="text-gray-600 mb-4">
              This component requires authentication. Sign in to see your linked providers.
            </p>
            <OAuthProviderManager />
          </div>
        )}
      </div>
      
      {/* Development Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">Development Notes</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• OAuth buttons use popup flow by default in examples for testing</li>
          <li>• In production, redirect flow is recommended for better UX</li>
          <li>• Provider status depends on auth-service configuration</li>
          <li>• Error handling includes user-friendly messages</li>
          <li>• State parameters provide CSRF protection</li>
        </ul>
      </div>
    </div>
  )
}

export default OAuthExamples