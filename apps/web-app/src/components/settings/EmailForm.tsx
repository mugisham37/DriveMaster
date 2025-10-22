'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { InputWithValidation } from '@/components/common/forms/InputWithValidation'

interface EmailFormProps {
  email: string
  links: {
    update: string
  }
}

export default function EmailForm({
  email,
  links
}: EmailFormProps): React.JSX.Element {
  const [newEmail, setNewEmail] = useState(email)
  const [password, setPassword] = useState('')

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({ email: newEmail, password })
  }

  const isEmailChanged = newEmail !== email
  const canSubmit = isEmailChanged && password.length > 0

  return (
    <form onSubmit={handleSubmit} className="email-form">
      <h2 className="text-h3 mb-6">Email Address</h2>
      
      <div className="form-group mb-4">
        <label htmlFor="current-email" className="form-label">
          Current Email
        </label>
        <input
          id="current-email"
          type="email"
          value={email}
          disabled
          className="form-input bg-backgroundColorB text-textColor6"
        />
      </div>

      <div className="form-group mb-4">
        <label htmlFor="new-email" className="form-label">
          New Email Address
        </label>
        <InputWithValidation
          id="new-email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Enter your new email address"
          className="form-input"
          required
        />
      </div>

      <div className="form-group mb-6">
        <label htmlFor="password" className="form-label">
          Current Password
        </label>
        <InputWithValidation
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your current password to confirm"
          className="form-input"
          required
        />
        <div className="form-note text-textColor6 text-sm mt-1">
          We need your password to confirm this sensitive change.
        </div>
      </div>

      <div className="form-footer">
        <FormButton
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Updating...' : 'Update Email'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">
            Email updated! Please check your inbox to verify your new email.
          </span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      {isEmailChanged && (
        <div className="warning-box mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-8">
          <p className="text-yellow-800 text-sm">
            <strong>Important:</strong> After updating your email, you&apos;ll need to verify 
            your new email address before you can sign in with it.
          </p>
        </div>
      )}
    </form>
  )
}