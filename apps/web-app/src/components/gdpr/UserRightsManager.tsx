'use client'

/**
 * User Rights Manager Component - GDPR Rights Exercise Interface
 * 
 * Implements:
 * - User rights exercise functionality (access, rectification, erasure, etc.)
 * - Rights request tracking and status monitoring
 * - Privacy settings management
 * - Data portability and restriction requests
 * - Requirements: 5.1, 5.3, 5.4, 5.5
 */

import React, { useState, useEffect } from 'react'
import { useGDPR } from '@/contexts/GDPRContext'
import type { RightsExerciseEntry, PrivacySettings } from '@/contexts/GDPRContext'

// ============================================================================
// Component Props
// ============================================================================

export interface UserRightsManagerProps {
  className?: string
}

// ============================================================================
// User Rights Configuration
// ============================================================================

interface UserRight {
  id: RightsExerciseEntry['rightType']
  title: string
  description: string
  details: string
  icon: string
  category: 'access' | 'control' | 'protection'
  complexity: 'simple' | 'moderate' | 'complex'
  timeframe: string
}

const USER_RIGHTS: UserRight[] = [
  {
    id: 'access',
    title: 'Right of Access',
    description: 'Request information about your personal data processing',
    details: 'You have the right to know what personal data we hold about you, how we use it, and who we share it with.',
    icon: '👁️',
    category: 'access',
    complexity: 'simple',
    timeframe: '30 days',
  },
  {
    id: 'rectification',
    title: 'Right to Rectification',
    description: 'Request correction of inaccurate or incomplete data',
    details: 'You can ask us to correct any personal data that is inaccurate or incomplete.',
    icon: '✏️',
    category: 'control',
    complexity: 'simple',
    timeframe: '30 days',
  },
  {
    id: 'erasure',
    title: 'Right to Erasure',
    description: 'Request deletion of your personal data',
    details: 'You can request that we delete your personal data in certain circumstances.',
    icon: '🗑️',
    category: 'control',
    complexity: 'complex',
    timeframe: '30 days',
  },
  {
    id: 'portability',
    title: 'Right to Data Portability',
    description: 'Request your data in a portable format',
    details: 'You can request a copy of your data in a structured, commonly used format.',
    icon: '📦',
    category: 'access',
    complexity: 'moderate',
    timeframe: '30 days',
  },
  {
    id: 'restriction',
    title: 'Right to Restrict Processing',
    description: 'Request limitation of data processing',
    details: 'You can ask us to limit how we process your personal data in certain situations.',
    icon: '⏸️',
    category: 'protection',
    complexity: 'moderate',
    timeframe: '30 days',
  },
  {
    id: 'objection',
    title: 'Right to Object',
    description: 'Object to processing based on legitimate interests',
    details: 'You can object to processing of your data when we rely on legitimate interests.',
    icon: '🚫',
    category: 'protection',
    complexity: 'moderate',
    timeframe: '30 days',
  },
]

// ============================================================================
// Main Component
// ============================================================================

export function UserRightsManager({ className = '' }: UserRightsManagerProps) {
  const {
    state,
    exerciseUserRight,
    getRightsExerciseHistory,
    updatePrivacySettings,
    isUpdating,
    error,
    clearError,
  } = useGDPR()

  const [selectedRight, setSelectedRight] = useState<UserRight | null>(null)
  const [requestDetails, setRequestDetails] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [rightsHistory, setRightsHistory] = useState<RightsExerciseEntry[]>([])
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(state.privacySettings)

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    const history = getRightsExerciseHistory()
    setRightsHistory(history)
  }, [getRightsExerciseHistory])

  useEffect(() => {
    setPrivacySettings(state.privacySettings)
  }, [state.privacySettings])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleRightSelect = (right: UserRight) => {
    setSelectedRight(right)
    setShowRequestForm(true)
    setRequestDetails('')
    clearError()
  }

  const handleSubmitRequest = async () => {
    if (!selectedRight || !requestDetails.trim()) return

    try {
      await exerciseUserRight(selectedRight.id, {
        rightType: selectedRight.id,
        description: requestDetails,
        requestedAt: new Date().toISOString(),
        complexity: selectedRight.complexity,
      })

      // Reset form
      setSelectedRight(null)
      setShowRequestForm(false)
      setRequestDetails('')

      // Refresh history
      const updatedHistory = getRightsExerciseHistory()
      setRightsHistory(updatedHistory)

    } catch (error) {
      console.error('Failed to submit rights request:', error)
    }
  }

  const handlePrivacySettingChange = async (
    setting: keyof PrivacySettings,
    value: boolean
  ) => {
    const updatedSettings = { ...privacySettings, [setting]: value }
    setPrivacySettings(updatedSettings)

    try {
      await updatePrivacySettings({ [setting]: value })
    } catch (error) {
      console.error('Failed to update privacy setting:', error)
      // Revert on error
      setPrivacySettings(state.privacySettings)
    }
  }

  const handleCancelRequest = () => {
    setSelectedRight(null)
    setShowRequestForm(false)
    setRequestDetails('')
    clearError()
  }

  // ============================================================================
  // Computed Values
  // ============================================================================

  const rightsByCategory = USER_RIGHTS.reduce((acc, right) => {
    if (!acc[right.category]) {
      acc[right.category] = []
    }
    acc[right.category].push(right)
    return acc
  }, {} as Record<string, UserRight[]>)

  const recentRequests = rightsHistory.slice(0, 5)
  const pendingRequests = rightsHistory.filter(req => req.status === 'pending' || req.status === 'processing')

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderRightCard = (right: UserRight) => {
    const complexityColors = {
      simple: 'green',
      moderate: 'yellow',
      complex: 'red',
    }
    const color = complexityColors[right.complexity]

    return (
      <div
        key={right.id}
        className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleRightSelect(right)}
      >
        <div className="flex items-start">
          <span className="text-3xl mr-4">{right.icon}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{right.title}</h3>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
                  {right.complexity}
                </span>
                <span className="text-xs text-gray-500">{right.timeframe}</span>
              </div>
            </div>
            <p className="text-gray-600 mb-3">{right.description}</p>
            <p className="text-sm text-gray-500">{right.details}</p>
          </div>
        </div>
      </div>
    )
  }

  const renderRequestForm = () => {
    if (!selectedRight) return null

    return (
      <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start mb-4">
          <span className="text-2xl mr-3">{selectedRight.icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Exercise {selectedRight.title}
            </h3>
            <p className="text-gray-600 mt-1">{selectedRight.description}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Please provide details about your request (minimum 20 characters):
          </label>
          <textarea
            value={requestDetails}
            onChange={(e) => setRequestDetails(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Describe your ${selectedRight.title.toLowerCase()} request in detail...`}
          />
          <div className="text-sm text-gray-500 mt-1">
            {requestDetails.length}/20 characters minimum
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• We will review your request within {selectedRight.timeframe}</li>
            <li>• You will receive updates on the status of your request</li>
            <li>• We may contact you if we need additional information</li>
            <li>• You can track the progress in your rights exercise history</li>
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleCancelRequest}
            className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitRequest}
            disabled={requestDetails.length < 20 || isUpdating}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isUpdating ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    )
  }

  const renderPrivacySettings = () => (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h3>
      <p className="text-gray-600 mb-6">
        Control how your data is processed and used
      </p>

      <div className="space-y-4">
        {[
          {
            key: 'dataMinimization' as keyof PrivacySettings,
            title: 'Data Minimization',
            description: 'Only collect and process data that is necessary for the service',
          },
          {
            key: 'anonymizeData' as keyof PrivacySettings,
            title: 'Data Anonymization',
            description: 'Anonymize your data when possible for analytics and research',
          },
          {
            key: 'restrictProcessing' as keyof PrivacySettings,
            title: 'Restrict Processing',
            description: 'Limit processing of your data to essential functions only',
          },
          {
            key: 'optOutAnalytics' as keyof PrivacySettings,
            title: 'Opt Out of Analytics',
            description: 'Exclude your data from analytics and performance tracking',
          },
          {
            key: 'optOutMarketing' as keyof PrivacySettings,
            title: 'Opt Out of Marketing',
            description: 'Do not use your data for marketing purposes',
          },
          {
            key: 'optOutPersonalization' as keyof PrivacySettings,
            title: 'Opt Out of Personalization',
            description: 'Disable personalized content and recommendations',
          },
        ].map(({ key, title, description }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{title}</div>
              <div className="text-sm text-gray-500">{description}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={privacySettings[key]}
                onChange={(e) => handlePrivacySettingChange(key, e.target.checked)}
                disabled={isUpdating}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  )

  const renderRightsHistory = () => {
    if (rightsHistory.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">📋</span>
          <p>No rights requests submitted yet</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {recentRequests.map((request) => (
          <div key={request.id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    request.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : request.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : request.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {request.status}
                  </span>
                  <span className="ml-2 font-medium text-gray-900">
                    {USER_RIGHTS.find(r => r.id === request.rightType)?.title || request.rightType}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {request.details.description || 'No description provided'}
                </p>
                <div className="text-xs text-gray-500">
                  Requested: {new Date(request.requestDate).toLocaleString()}
                  {request.completionDate && (
                    <span className="ml-4">
                      Completed: {new Date(request.completionDate).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Your Privacy Rights</h2>
        <p className="text-gray-600 mt-1">
          Exercise your data protection rights under GDPR
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-red-500 text-lg mr-3">❌</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Failed to Process Request
              </h3>
              <p className="text-sm text-red-700 mt-1">{error.message}</p>
              <button
                onClick={() => clearError()}
                className="text-red-800 hover:text-red-900 font-medium underline text-sm mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-blue-500 text-lg mr-3">ℹ️</span>
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Pending Rights Requests
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                You have {pendingRequests.length} pending rights request{pendingRequests.length !== 1 ? 's' : ''}. 
                We will process them within 30 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Request Form */}
      {showRequestForm && renderRequestForm()}

      {/* Rights Categories */}
      {!showRequestForm && (
        <div className="space-y-8">
          {Object.entries(rightsByCategory).map(([category, rights]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                {category === 'access' ? 'Information Access' :
                 category === 'control' ? 'Data Control' : 'Data Protection'} Rights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rights.map(renderRightCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Privacy Settings */}
      {!showRequestForm && renderPrivacySettings()}

      {/* Rights Exercise History */}
      {!showRequestForm && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Rights Exercise History
          </h3>
          {renderRightsHistory()}
        </div>
      )}

      {/* Legal Information */}
      {!showRequestForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-gray-500 text-lg mr-3">⚖️</span>
            <div className="text-sm text-gray-700">
              <h4 className="font-medium mb-1">Your Rights Under GDPR</h4>
              <ul className="space-y-1">
                <li>• All rights requests are processed within 30 days</li>
                <li>• You can exercise these rights free of charge</li>
                <li>• We may ask for additional information to verify your identity</li>
                <li>• Some rights may not apply in certain circumstances</li>
                <li>• You can contact our Data Protection Officer for assistance</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserRightsManager