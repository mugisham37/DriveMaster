'use client'

/**
 * Consent Management Component - Granular Consent Preferences
 * 
 * Implements:
 * - Granular consent preference management
 * - Consent withdrawal and modification workflows
 * - Consent history tracking
 * - Legal basis information
 * - Requirements: 5.1, 5.3, 5.4
 */

import React, { useState, useEffect } from 'react'
import { useGDPR } from '@/contexts/GDPRContext'
import type { 
  ConsentPreferences, 
  DataRetentionPreference,
} from '@/types/user-service'
import type { ConsentHistoryEntry } from '@/contexts/GDPRContext'

// ============================================================================
// Component Props
// ============================================================================

export interface ConsentManagementProps {
  consentPreferences: ConsentPreferences | null
  onConsentUpdate?: (consent: ConsentPreferences) => void
  showAdvancedOptions?: boolean
  className?: string
}

// ============================================================================
// Consent Configuration
// ============================================================================

interface ConsentConfig {
  key: keyof ConsentPreferences
  title: string
  description: string
  purpose: string
  legalBasis: string
  consequences: string
  category: 'essential' | 'functional' | 'analytics' | 'marketing'
  required: boolean
  icon: string
}

const CONSENT_CONFIGS: ConsentConfig[] = [
  {
    key: 'analytics',
    title: 'Analytics & Performance',
    description: 'Allow us to collect anonymous usage data to improve our service',
    purpose: 'Service improvement and performance optimization',
    legalBasis: 'Legitimate interest / Consent',
    consequences: 'Without this consent, we cannot provide personalized insights about your learning progress',
    category: 'analytics',
    required: false,
    icon: '📊',
  },
  {
    key: 'marketing',
    title: 'Marketing Communications',
    description: 'Receive promotional emails, newsletters, and product updates',
    purpose: 'Marketing communications and product updates',
    legalBasis: 'Consent',
    consequences: 'You will not receive promotional content, but essential service communications will continue',
    category: 'marketing',
    required: false,
    icon: '📧',
  },
  {
    key: 'personalization',
    title: 'Personalization',
    description: 'Personalize your learning experience based on your preferences and behavior',
    purpose: 'Content personalization and recommendation engine',
    legalBasis: 'Consent',
    consequences: 'You will receive generic content instead of personalized recommendations',
    category: 'functional',
    required: false,
    icon: '🎯',
  },
  {
    key: 'thirdPartySharing',
    title: 'Third-Party Sharing',
    description: 'Share anonymized data with educational partners for research purposes',
    purpose: 'Educational research and industry insights',
    legalBasis: 'Consent',
    consequences: 'Your data will not be shared with third parties for research purposes',
    category: 'analytics',
    required: false,
    icon: '🤝',
  },
]

// ============================================================================
// Main Component
// ============================================================================

export function ConsentManagement({
  consentPreferences,
  onConsentUpdate,
  showAdvancedOptions = false,
  className = '',
}: ConsentManagementProps) {
  const {
    state,
    updateConsentPreferences,
    grantConsent,
    withdrawConsent,
    getConsentHistory,
    updateDataRetentionSettings,
    isUpdating,
    error,
    clearError,
  } = useGDPR()

  const [localConsent, setLocalConsent] = useState<ConsentPreferences | null>(null)
  const [consentHistory, setConsentHistory] = useState<ConsentHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(showAdvancedOptions)
  const [pendingChanges, setPendingChanges] = useState<Set<keyof ConsentPreferences>>(new Set())

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (consentPreferences) {
      setLocalConsent(consentPreferences)
    }
  }, [consentPreferences])

  useEffect(() => {
    const history = getConsentHistory()
    setConsentHistory(history)
  }, [getConsentHistory])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleConsentChange = async (
    consentKey: keyof ConsentPreferences, 
    granted: boolean,
    reason?: string
  ) => {
    if (!localConsent) return

    try {
      clearError()
      setPendingChanges(prev => new Set(prev).add(consentKey))

      const updatedConsent = {
        ...localConsent,
        [consentKey]: granted,
      }

      setLocalConsent(updatedConsent)

      if (granted) {
        await grantConsent(consentKey, `User granted ${consentKey} consent`)
      } else {
        await withdrawConsent(consentKey, reason || `User withdrew ${consentKey} consent`)
      }

      onConsentUpdate?.(updatedConsent)
      
    } catch (error) {
      console.error('Failed to update consent:', error)
      // Revert local state on error
      if (consentPreferences) {
        setLocalConsent(consentPreferences)
      }
    } finally {
      setPendingChanges(prev => {
        const newSet = new Set(prev)
        newSet.delete(consentKey)
        return newSet
      })
    }
  }

  const handleBulkConsentUpdate = async (consents: Partial<ConsentPreferences>) => {
    if (!localConsent) return

    try {
      clearError()
      const updatedConsent = { ...localConsent, ...consents }
      setLocalConsent(updatedConsent)
      
      await updateConsentPreferences(consents)
      onConsentUpdate?.(updatedConsent)
      
    } catch (error) {
      console.error('Failed to update bulk consents:', error)
      if (consentPreferences) {
        setLocalConsent(consentPreferences)
      }
    }
  }

  const handleAcceptAll = () => {
    const allConsents = CONSENT_CONFIGS.reduce((acc, config) => ({
      ...acc,
      [config.key]: true,
    }), {} as Partial<ConsentPreferences>)

    handleBulkConsentUpdate(allConsents)
  }

  const handleRejectAll = () => {
    const allConsents = CONSENT_CONFIGS.reduce((acc, config) => ({
      ...acc,
      [config.key]: false,
    }), {} as Partial<ConsentPreferences>)

    handleBulkConsentUpdate(allConsents)
  }

  const handleDataRetentionUpdate = async (retention: Partial<DataRetentionPreference>) => {
    try {
      await updateDataRetentionSettings(retention)
    } catch (error) {
      console.error('Failed to update data retention settings:', error)
    }
  }

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderConsentToggle = (config: ConsentConfig) => {
    const consentValue = localConsent?.[config.key]
    const isGranted = typeof consentValue === 'boolean' ? consentValue : false
    const isPending = pendingChanges.has(config.key)
    const categoryColor = {
      essential: 'blue',
      functional: 'green',
      analytics: 'yellow',
      marketing: 'purple',
    }[config.category]

    return (
      <div key={config.key} className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">{config.icon}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {config.title}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${categoryColor}-100 text-${categoryColor}-800`}>
                  {config.category}
                </span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-3">{config.description}</p>
            
            <div className="space-y-2 text-sm text-gray-500">
              <div>
                <span className="font-medium">Purpose:</span> {config.purpose}
              </div>
              <div>
                <span className="font-medium">Legal Basis:</span> {config.legalBasis}
              </div>
              {showAdvanced && (
                <div>
                  <span className="font-medium">Consequences of withdrawal:</span> {config.consequences}
                </div>
              )}
            </div>
          </div>

          <div className="ml-6 flex-shrink-0">
            <div className="flex items-center">
              {isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              )}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGranted}
                  onChange={(e) => handleConsentChange(config.key, e.target.checked)}
                  disabled={isPending || isUpdating}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="text-right mt-2">
              <span className={`text-sm font-medium ${
                isGranted ? 'text-green-600' : 'text-gray-500'
              }`}>
                {isGranted ? 'Granted' : 'Not granted'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderConsentHistory = () => {
    if (consentHistory.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-4 block">📋</span>
          <p>No consent history available</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {consentHistory.slice(0, 10).map((entry) => (
          <div key={entry.id} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center mb-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    entry.granted 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {entry.granted ? 'Granted' : 'Withdrawn'}
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {entry.consentType}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{entry.purpose}</p>
                <div className="text-xs text-gray-500 mt-1">
                  Legal basis: {entry.legalBasis}
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>{entry.timestamp.toLocaleDateString()}</div>
                <div>{entry.timestamp.toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderDataRetentionSettings = () => (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Data Retention Preferences
      </h3>
      <p className="text-gray-600 mb-6">
        Control how long we keep different types of your data
      </p>

      <div className="space-y-4">
        {[
          { key: 'profile', label: 'Profile Data', description: 'Your account and profile information' },
          { key: 'activity', label: 'Activity Data', description: 'Your learning activities and interactions' },
          { key: 'progress', label: 'Progress Data', description: 'Your learning progress and achievements' },
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
            <div>
              <div className="font-medium text-gray-900">{label}</div>
              <div className="text-sm text-gray-500">{description}</div>
            </div>
            <select
              className="ml-4 border border-gray-300 rounded-md px-3 py-1 text-sm"
              defaultValue={state.dataRetentionSettings[key as keyof DataRetentionPreference]}
              onChange={(e) => handleDataRetentionUpdate({
                [key]: parseInt(e.target.value)
              } as Partial<DataRetentionPreference>)}
            >
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
              <option value={1825}>5 years</option>
              <option value={-1}>Indefinitely</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  )

  // ============================================================================
  // Render
  // ============================================================================

  if (!localConsent) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading consent preferences...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Consent Management</h2>
          <p className="text-gray-600 mt-1">
            Control how your data is used and processed
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-red-500 text-lg mr-3">❌</span>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Failed to Update Consent
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

      {/* Quick Actions */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <div>
          <h3 className="font-medium text-gray-900">Quick Actions</h3>
          <p className="text-sm text-gray-600">Manage all consents at once</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAcceptAll}
            disabled={isUpdating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Accept All
          </button>
          <button
            onClick={handleRejectAll}
            disabled={isUpdating}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Reject All
          </button>
        </div>
      </div>

      {/* Consent Toggles */}
      <div className="space-y-4">
        {CONSENT_CONFIGS.map(renderConsentToggle)}
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-6">
          {renderDataRetentionSettings()}
          
          {/* Consent History */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Consent History
              </h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
            
            {showHistory && renderConsentHistory()}
          </div>
        </div>
      )}

      {/* Legal Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-blue-500 text-lg mr-3">ℹ️</span>
          <div className="text-sm text-blue-800">
            <h4 className="font-medium mb-1">Your Rights</h4>
            <p>
              You can withdraw your consent at any time. This will not affect the lawfulness 
              of processing based on consent before its withdrawal. You also have the right 
              to access, rectify, erase, restrict processing, and data portability.
            </p>
            <p className="mt-2">
              For more information about your rights and how we process your data, 
              please see our Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsentManagement