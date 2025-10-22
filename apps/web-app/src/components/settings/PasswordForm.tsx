'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { InputWithValidation } from '@/components/common/forms/InputWithValidation'

interface PasswordFormProps {
  links: {
    update: string
  }
}

export default function PasswordForm({
  links
}: PasswordFormProps): React.JSX.Element {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      return
    }

    await submit({
      current_password: formData.currentPassword,
      password: formData.newPassword,
      password_confirmation: formData.confirmPassword
    })

    // Clear form on success
    if (isSuccess) {
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const passwordsMatch = formData.newPassword === formData.confirmPassword
  const canSubmit = formData.currentPassword && formData.newPassword && 
                   formData.confirmPassword && passwordsMatch

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: 'weak', color: 'text-red-600' }
    if (password.length < 10) return { strength: 'medium', color: 'text-yellow-600' }
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)) {
      return { strength: 'strong', color: 'text-green-600' }
    }
    return { strength: 'medium', color: 'text-yellow-600' }
  }

  const passwordStrength = getPasswordStrength(formData.newPassword)

  return (
    <form onSubmit={handleSubmit} className="password-form">
      <h2 className="text-h3 mb-6">Change Password</h2>
      
      <div className="form-group mb-4">
        <label htmlFor="current-password" className="form-label">
          Current Password
        </label>
        <InputWithValidation
          id="current-password"
          type="password"
          value={formData.currentPassword}
          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
          placeholder="Enter your current password"
          className="form-input"
          required
        />
      </div>

      <div className="form-group mb-4">
        <label htmlFor="new-password" className="form-label">
          New Password
        </label>
        <InputWithValidation
          id="new-password"
          type="password"
          value={formData.newPassword}
          onChange={(e) => handleInputChange('newPassword', e.target.value)}
          placeholder="Enter your new password"
          className="form-input"
          required
        />
        {formData.newPassword && (
          <div className={`form-note text-sm mt-1 ${passwordStrength.color}`}>
            Password strength: {passwordStrength.strength}
          </div>
        )}
      </div>

      <div className="form-group mb-6">
        <label htmlFor="confirm-password" className="form-label">
          Confirm New Password
        </label>
        <InputWithValidation
          id="confirm-password"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          placeholder="Confirm your new password"
          className="form-input"
          required
          error={formData.confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
        />
      </div>

      <div className="form-footer">
        <FormButton
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">Password updated successfully!</span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      <div className="password-requirements mt-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h4 className="text-sm font-semibold mb-2">Password Requirements:</h4>
        <ul className="text-sm text-textColor6 space-y-1">
          <li>• At least 6 characters long</li>
          <li>• For strong security: include uppercase, lowercase, numbers, and symbols</li>
          <li>• Avoid common passwords and personal information</li>
        </ul>
      </div>
    </form>
  )
}