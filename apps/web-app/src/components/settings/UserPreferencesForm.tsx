'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'

interface UserPreference {
  key: string
  label: string
  description: string
  type: 'boolean' | 'select' | 'text'
  value: unknown
  options?: Array<{ value: unknown; label: string }>
}

interface UserPreferencesFormProps {
  preferences: UserPreference[]
  links: {
    update: string
  }
}

export default function UserPreferencesForm({
  preferences: initialPreferences,
  links
}: UserPreferencesFormProps): React.JSX.Element {
  const [preferences, setPreferences] = useState(initialPreferences)

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const preferencesData = preferences.reduce((acc, pref) => {
      acc[pref.key] = pref.value
      return acc
    }, {} as Record<string, unknown>)

    await submit({ user_preferences: preferencesData })
  }

  const handlePreferenceChange = (key: string, value: unknown) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.key === key ? { ...pref, value } : pref
      )
    )
  }

  return (
    <form onSubmit={handleSubmit} className="user-preferences-form">
      <h2 className="text-h3 mb-6">General Preferences</h2>
      
      <div className="preferences-list space-y-6">
        {preferences.map((pref) => (
          <div key={pref.key} className="preference-item">
            <div className="preference-header mb-2">
              <label className="form-label">
                {pref.label}
              </label>
              {pref.description && (
                <p className="text-textColor6 text-sm">
                  {pref.description}
                </p>
              )}
            </div>
            
            <div className="preference-control">
              {pref.type === 'boolean' && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(pref.value)}
                    onChange={(e) => handlePreferenceChange(pref.key, e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="text-sm">Enable this preference</span>
                </label>
              )}
              
              {pref.type === 'select' && pref.options && (
                <select
                  value={String(pref.value || '')}
                  onChange={(e) => handlePreferenceChange(pref.key, e.target.value)}
                  className="form-select"
                >
                  {pref.options.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              
              {pref.type === 'text' && (
                <input
                  type="text"
                  value={String(pref.value || '')}
                  onChange={(e) => handlePreferenceChange(pref.key, e.target.value)}
                  className="form-input"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="form-footer mt-8">
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
    </form>
  )
}