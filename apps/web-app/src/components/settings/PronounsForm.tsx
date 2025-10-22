'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { InputWithValidation } from '@/components/common/forms/InputWithValidation'
import { ProminentLink } from '@/components/common/ProminentLink'

interface PronounsFormProps {
  handle: string
  pronoun_parts: {
    subject?: string
    object?: string
    possessive?: string
  }
  links: {
    update: string
    info: string
  }
}

export default function PronounsForm({
  handle,
  pronoun_parts,
  links
}: PronounsFormProps): React.JSX.Element {
  const [pronouns, setPronouns] = useState({
    subject: pronoun_parts.subject || '',
    object: pronoun_parts.object || '',
    possessive: pronoun_parts.possessive || ''
  })

  const [usePreset, setUsePreset] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('')

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH'
  })

  const presetPronouns = [
    { label: 'she/her/hers', subject: 'she', object: 'her', possessive: 'hers' },
    { label: 'he/him/his', subject: 'he', object: 'him', possessive: 'his' },
    { label: 'they/them/theirs', subject: 'they', object: 'them', possessive: 'theirs' },
    { label: 'ze/zir/zirs', subject: 'ze', object: 'zir', possessive: 'zirs' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({ pronoun_parts: pronouns })
  }

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    const presetData = presetPronouns.find(p => p.label === preset)
    if (presetData) {
      setPronouns({
        subject: presetData.subject,
        object: presetData.object,
        possessive: presetData.possessive
      })
    }
  }

  const handleCustomChange = (field: string, value: string) => {
    setPronouns(prev => ({ ...prev, [field]: value }))
    setSelectedPreset('') // Clear preset selection when custom editing
  }

  const clearPronouns = () => {
    setPronouns({ subject: '', object: '', possessive: '' })
    setSelectedPreset('')
  }

  const hasPronouns = pronouns.subject || pronouns.object || pronouns.possessive

  return (
    <form onSubmit={handleSubmit} className="pronouns-form">
      <h2 className="text-h3 mb-6">Pronouns</h2>
      
      <div className="pronouns-info mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <p className="text-textColor2 mb-2">
          Help others know how to refer to you respectfully. Your pronouns will be 
          displayed on your profile and used in community interactions.
        </p>
        <ProminentLink
          link={links.info}
          text="Learn more about pronouns on Exercism"
          external={true}
        />
      </div>

      <div className="form-section mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!usePreset}
              onChange={() => setUsePreset(false)}
              className="form-radio"
            />
            <span>Use common pronouns</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={usePreset}
              onChange={() => setUsePreset(true)}
              className="form-radio"
            />
            <span>Enter custom pronouns</span>
          </label>
        </div>

        {!usePreset ? (
          <div className="preset-pronouns">
            <div className="grid grid-cols-2 gap-3">
              {presetPronouns.map((preset) => (
                <label key={preset.label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="preset-pronouns"
                    value={preset.label}
                    checked={selectedPreset === preset.label}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="form-radio"
                  />
                  <span>{preset.label}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={clearPronouns}
              className="text-textColor6 text-sm mt-3 hover:text-textColor2"
            >
              Clear pronouns
            </button>
          </div>
        ) : (
          <div className="custom-pronouns space-y-4">
            <div className="form-group">
              <label htmlFor="subject" className="form-label">
                Subject pronoun
              </label>
              <InputWithValidation
                id="subject"
                type="text"
                value={pronouns.subject}
                onChange={(e) => handleCustomChange('subject', e.target.value)}
                placeholder="e.g., she, he, they, ze"
                className="form-input"
              />
              <div className="form-note text-textColor6 text-sm mt-1">
                Used as: &quot;{pronouns.subject || '[subject]'} wrote some code&quot;
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="object" className="form-label">
                Object pronoun
              </label>
              <InputWithValidation
                id="object"
                type="text"
                value={pronouns.object}
                onChange={(e) => handleCustomChange('object', e.target.value)}
                placeholder="e.g., her, him, them, zir"
                className="form-input"
              />
              <div className="form-note text-textColor6 text-sm mt-1">
                Used as: &quot;I sent {pronouns.object || '[object]'} a message&quot;
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="possessive" className="form-label">
                Possessive pronoun
              </label>
              <InputWithValidation
                id="possessive"
                type="text"
                value={pronouns.possessive}
                onChange={(e) => handleCustomChange('possessive', e.target.value)}
                placeholder="e.g., hers, his, theirs, zirs"
                className="form-input"
              />
              <div className="form-note text-textColor6 text-sm mt-1">
                Used as: &quot;The solution is {pronouns.possessive || '[possessive]'}&quot;
              </div>
            </div>
          </div>
        )}
      </div>

      {hasPronouns && (
        <div className="preview-section mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
          <h3 className="text-h4 mb-3">Preview</h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>{handle}</strong> shared {pronouns.possessive || 'their'} solution. 
              {pronouns.subject ? ` ${pronouns.subject.charAt(0).toUpperCase() + pronouns.subject.slice(1)}` : ' They'} 
              {' '}wrote it in Python.
            </p>
            <p>
              You can send {pronouns.object || 'them'} a message about {pronouns.possessive || 'their'} approach.
            </p>
          </div>
        </div>
      )}

      <div className="form-footer">
        <FormButton
          type="submit"
          disabled={isSubmitting}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Saving...' : 'Save Pronouns'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">Pronouns updated successfully!</span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      <div className="pronouns-note mt-6 p-4 bg-blue-50 border border-blue-200 rounded-8">
        <p className="text-blue-800 text-sm">
          <strong>Privacy note:</strong> Your pronouns are public and will be visible 
          to all Exercism users. You can change or remove them at any time.
        </p>
      </div>
    </form>
  )
}