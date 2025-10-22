'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { InputWithValidation } from '@/components/common/forms/InputWithValidation'
import { TextAreaWithValidation } from '@/components/common/forms/TextAreaWithValidation'

interface ProfileFormProps {
  user: {
    name?: string
    location?: string
    bio?: string
    seniority?: string
  }
  profile?: {
    twitter?: string
    github?: string
    linkedin?: string
  }
  links: {
    update: string
  }
}

export default function ProfileForm({
  user,
  profile,
  links
}: ProfileFormProps): React.JSX.Element {
  const [formData, setFormData] = useState({
    name: user.name || '',
    location: user.location || '',
    bio: user.bio || '',
    seniority: user.seniority || '',
    twitter: profile?.twitter || '',
    github: profile?.github || '',
    linkedin: profile?.linkedin || ''
  })

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit(formData)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="profile-form">
      <h2 className="text-h3 mb-6">Profile Information</h2>
      
      <div className="form-group mb-4">
        <label htmlFor="name" className="form-label">
          Full Name
        </label>
        <InputWithValidation
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="How do you want to be known?"
          className="form-input"
        />
      </div>

      <div className="form-group mb-4">
        <label htmlFor="location" className="form-label">
          Location <span className="text-textColor6">(optional)</span>
        </label>
        <InputWithValidation
          id="location"
          type="text"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          placeholder="Where do you currently live?"
          className="form-input"
        />
        <div className="form-note text-textColor6 text-sm mt-1">
          Exercism is made up of people from all over the world. Share where you&apos;re from!
        </div>
      </div>

      <div className="form-group mb-4">
        <label htmlFor="bio" className="form-label">
          Bio <span className="text-textColor6">(optional)</span>
        </label>
        <TextAreaWithValidation
          id="bio"
          value={formData.bio}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          placeholder="Tell everyone a bit more about yourself"
          className="form-textarea"
          rows={4}
        />
        <div className="character-count text-textColor6 text-sm mt-1">
          {formData.bio.length} characters
        </div>
      </div>

      <div className="form-group mb-4">
        <label htmlFor="seniority" className="form-label">
          Experience Level
        </label>
        <select
          id="seniority"
          value={formData.seniority}
          onChange={(e) => handleInputChange('seniority', e.target.value)}
          className="form-select"
        >
          <option value="">Select your level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      <h3 className="text-h4 mb-4 mt-8">Social Links</h3>

      <div className="form-group mb-4">
        <label htmlFor="github" className="form-label">
          GitHub Username
        </label>
        <InputWithValidation
          id="github"
          type="text"
          value={formData.github}
          onChange={(e) => handleInputChange('github', e.target.value)}
          placeholder="your-github-username"
          className="form-input"
        />
      </div>

      <div className="form-group mb-4">
        <label htmlFor="twitter" className="form-label">
          Twitter Username
        </label>
        <InputWithValidation
          id="twitter"
          type="text"
          value={formData.twitter}
          onChange={(e) => handleInputChange('twitter', e.target.value)}
          placeholder="your-twitter-handle"
          className="form-input"
        />
      </div>

      <div className="form-group mb-6">
        <label htmlFor="linkedin" className="form-label">
          LinkedIn Username
        </label>
        <InputWithValidation
          id="linkedin"
          type="text"
          value={formData.linkedin}
          onChange={(e) => handleInputChange('linkedin', e.target.value)}
          placeholder="your-linkedin-username"
          className="form-input"
        />
      </div>

      <div className="form-footer">
        <FormButton
          type="submit"
          disabled={isSubmitting}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Saving...' : 'Save Profile'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">Profile saved successfully!</span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>
    </form>
  )
}