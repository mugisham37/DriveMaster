'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'

interface CommunicationPreference {
  key: string
  label: string
  description: string
  enabled: boolean
  category: 'email' | 'notifications' | 'marketing'
}

interface CommunicationPreferencesFormProps {
  preferences: CommunicationPreference[]
  links: {
    update: string
  }
}

export default function CommunicationPreferencesForm({
  preferences: initialPreferences,
  links
}: CommunicationPreferencesFormProps): React.JSX.Element {
  const [preferences, setPreferences] = useState(initialPreferences)

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH',
    successMessage: 'Communication preferences updated successfully!'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const preferencesData = preferences.reduce((acc, pref) => {
      acc[pref.key] = pref.enabled
      return acc
    }, {} as Record<string, boolean>)

    await submit({ communication_preferences: preferencesData })
  }

  const handlePreferenceChange = (key: string, enabled: boolean) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.key === key ? { ...pref, enabled } : pref
      )
    )
  }

  const toggleCategory = (category: string, enabled: boolean) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.category === category ? { ...pref, enabled } : pref
      )
    )
  }

  const groupedPreferences = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) {
      acc[pref.category] = []
    }
    acc[pref.category].push(pref)
    return acc
  }, {} as Record<string, CommunicationPreference[]>)

  const categoryLabels = {
    email: 'Email Notifications',
    notifications: 'In-App Notifications',
    marketing: 'Marketing Communications'
  }

  const categoryDescriptions = {
    email: 'Receive notifications via email',
    notifications: 'See notifications when using Exercism',
    marketing: 'Updates about new features and community events'
  }

  return (
    <form onSubmit={handleSubmit} className="communication-preferences-form">
      <h2 className="text-h3 mb-6">Communication Preferences</h2>
      
      <div className="preferences-intro mb-8 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <p className="text-textColor2">
          Choose how you'd like to receive communications from Exercism. 
          You can customize notifications for different types of activities.
        </p>
      </div>

      {Object.entries(groupedPreferences).map(([category, categoryPrefs]) => {
        const allEnabled = categoryPrefs.every(pref => pref.enabled)
        const someEnabled = categoryPrefs.some(pref => pref.enabled)

        return (
          <div key={category} className="preference-category mb-8">
            <div className="category-header mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-h4 mb-1">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h3>
                  <p className="text-textColor6 text-sm">
                    {categoryDescriptions[category as keyof typeof categoryDescriptions]}
                  </p>
                </div>
                <div className="category-toggle">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allEnabled}
                      ref={(input) => {
                        if (input) input.indeterminate = someEnabled && !allEnabled
                      }}
                      onChange={(e) => toggleCategory(category, e.target.checked)}
                      className="form-checkbox"
                    />
                    <span className="text-sm text-textColor6">
                      {allEnabled ? 'All enabled' : someEnabled ? 'Some enabled' : 'All disabled'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="category-preferences space-y-3 ml-4">
              {categoryPrefs.map((pref) => (
                <div key={pref.key} className="preference-item">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={pref.enabled}
                      onChange={(e) => handlePreferenceChange(pref.key, e.target.checked)}
                      className="form-checkbox mt-1"
                    />
                    <div>
                      <div className="preference-label font-medium text-textColor2">
                        {pref.label}
                      </div>
                      <div className="preference-description text-sm text-textColor6">
                        {pref.description}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="form-footer">
        <FormButton
          type="submit"
          disabled={isSubmitting}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Saving...' : 'Save Preferences'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">Preferences updated successfully!</span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      <div className="preferences-note mt-8 p-4 bg-blue-50 border border-blue-200 rounded-8">
        <h4 className="text-blue-800 font-semibold mb-2">Important Notes:</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Some critical notifications (like security alerts) cannot be disabled</li>
          <li>• Email preferences may take up to 24 hours to take effect</li>
          <li>• You can unsubscribe from marketing emails using the link in any marketing email</li>
          <li>• Disabling notifications won't affect your ability to use Exercism features</li>
        </ul>
      </div>
    </form>
  )
}