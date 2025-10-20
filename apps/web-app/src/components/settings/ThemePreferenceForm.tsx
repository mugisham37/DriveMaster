'use client'

import React, { useState, useEffect } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface ThemePreferenceFormProps {
  default_theme_preference: string
  insiders_status: string
  links: {
    update: string
    insiders_path: string
  }
}

export default function ThemePreferenceForm({
  default_theme_preference,
  insiders_status,
  links
}: ThemePreferenceFormProps): React.JSX.Element {
  const [selectedTheme, setSelectedTheme] = useState(default_theme_preference)

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH',
    successMessage: 'Theme preference updated successfully!'
  })

  const isInsider = insiders_status === 'active' || insiders_status === 'active_lifetime'

  const themes = [
    {
      id: 'light',
      name: 'Light',
      description: 'Clean and bright interface',
      icon: 'sun',
      available: true
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes in low light',
      icon: 'moon',
      available: isInsider
    },
    {
      id: 'system',
      name: 'System',
      description: 'Matches your device settings',
      icon: 'monitor',
      available: true
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({ theme: selectedTheme })
  }

  const handleThemeSelect = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId)
    if (theme?.available) {
      setSelectedTheme(themeId)
    }
  }

  // Apply theme immediately for preview
  useEffect(() => {
    if (selectedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', selectedTheme)
    }
  }, [selectedTheme])

  return (
    <form onSubmit={handleSubmit} className="theme-preference-form">
      <h2 className="text-h3 mb-6">Theme Preference</h2>
      
      {!isInsider && (
        <div className="insider-notice mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
          <div className="flex items-start gap-3">
            <GraphicalIcon icon="lock" className="text-textColor6 mt-1" />
            <div>
              <p className="text-textColor2 mb-2">
                <strong>Dark theme is an Insider feature</strong>
              </p>
              <p className="text-textColor6 text-sm mb-3">
                Become an Insider to unlock dark theme and other exclusive features.
              </p>
              <a
                href={links.insiders_path}
                className="btn-primary btn-xs"
              >
                Learn about Insiders
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="theme-options space-y-3 mb-6">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className={`theme-option p-4 border rounded-8 cursor-pointer transition-all ${
              selectedTheme === theme.id
                ? 'border-prominentLinkColor bg-prominentLinkColor bg-opacity-5'
                : 'border-borderColor6 hover:border-borderColor4'
            } ${
              !theme.available ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => handleThemeSelect(theme.id)}
          >
            <div className="flex items-center gap-3">
              <div className="theme-radio">
                <input
                  type="radio"
                  name="theme"
                  value={theme.id}
                  checked={selectedTheme === theme.id}
                  onChange={() => handleThemeSelect(theme.id)}
                  disabled={!theme.available}
                  className="form-radio"
                />
              </div>
              
              <div className="theme-icon">
                <GraphicalIcon 
                  icon={theme.icon} 
                  className={`w-6 h-6 ${
                    selectedTheme === theme.id ? 'text-prominentLinkColor' : 'text-textColor6'
                  }`}
                />
              </div>
              
              <div className="theme-info flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-textColor2 font-semibold">
                    {theme.name}
                  </h3>
                  {!theme.available && (
                    <span className="text-xs bg-textColor6 text-white px-2 py-1 rounded">
                      Insider Only
                    </span>
                  )}
                </div>
                <p className="text-textColor6 text-sm">
                  {theme.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="theme-preview mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h3 className="text-h4 mb-3">Preview</h3>
        <div className="preview-content space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-prominentLinkColor rounded"></div>
            <span className="text-textColor2">Primary elements</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-textColor2 rounded"></div>
            <span className="text-textColor2">Text content</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-backgroundColorB rounded border border-borderColor6"></div>
            <span className="text-textColor6">Background elements</span>
          </div>
        </div>
      </div>

      <div className="form-footer">
        <FormButton
          type="submit"
          disabled={isSubmitting || selectedTheme === default_theme_preference}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Saving...' : 'Save Theme Preference'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">Theme updated successfully!</span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      <div className="theme-info mt-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h4 className="text-sm font-semibold mb-2">About Themes:</h4>
        <ul className="text-sm text-textColor6 space-y-1">
          <li>• <strong>Light:</strong> The default Exercism experience with bright backgrounds</li>
          <li>• <strong>Dark:</strong> Easier on the eyes in low-light environments (Insider feature)</li>
          <li>• <strong>System:</strong> Automatically switches based on your device's theme setting</li>
        </ul>
      </div>
    </form>
  )
}