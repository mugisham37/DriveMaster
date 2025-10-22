'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { InputWithValidation } from '@/components/common/forms/InputWithValidation'

interface HandleFormProps {
  handle: string
  links: {
    update: string
  }
}

export default function HandleForm({
  handle,
  links
}: HandleFormProps): React.JSX.Element {
  const [newHandle, setNewHandle] = useState(handle)
  const [password, setPassword] = useState('')

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({ handle: newHandle, password })
  }

  const isHandleChanged = newHandle !== handle
  const canSubmit = isHandleChanged && password.length > 0 && isValidHandle(newHandle)

  function isValidHandle(handle: string): boolean {
    // Handle validation: alphanumeric, hyphens, underscores, 3-20 chars
    const handleRegex = /^[a-zA-Z0-9_-]{3,20}$/
    return handleRegex.test(handle)
  }

  const handleError = !isValidHandle(newHandle) && newHandle.length > 0 
    ? 'Handle must be 3-20 characters and contain only letters, numbers, hyphens, and underscores'
    : undefined

  return (
    <form onSubmit={handleSubmit} className="handle-form">
      <h2 className="text-h3 mb-6">Username (Handle)</h2>
      
      <div className="form-group mb-4">
        <label htmlFor="current-handle" className="form-label">
          Current Handle
        </label>
        <input
          id="current-handle"
          type="text"
          value={handle}
          disabled
          className="form-input bg-backgroundColorB text-textColor6"
        />
      </div>

      <div className="form-group mb-4">
        <label htmlFor="new-handle" className="form-label">
          New Handle
        </label>
        <InputWithValidation
          id="new-handle"
          type="text"
          value={newHandle}
          onChange={(e) => setNewHandle(e.target.value.toLowerCase())}
          placeholder="Enter your new handle"
          className="form-input"
          error={handleError}
          required
        />
        <div className="form-note text-textColor6 text-sm mt-1">
          Your handle is how others will find and mention you on Exercism.
        </div>
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
          {isSubmitting ? 'Updating...' : 'Update Handle'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">Handle updated successfully!</span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      <div className="warning-box mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-8">
        <h4 className="text-yellow-800 font-semibold mb-2">Important Notes:</h4>
        <ul className="text-yellow-800 text-sm space-y-1">
          <li>• Your old handle will become available for others to use</li>
          <li>• Links to your profile with the old handle will break</li>
          <li>• You can only change your handle once every 30 days</li>
          <li>• Handle must be unique across all Exercism users</li>
        </ul>
      </div>

      <div className="handle-requirements mt-4 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h4 className="text-sm font-semibold mb-2">Handle Requirements:</h4>
        <ul className="text-sm text-textColor6 space-y-1">
          <li>• 3-20 characters long</li>
          <li>• Letters, numbers, hyphens (-), and underscores (_) only</li>
          <li>• Cannot start or end with special characters</li>
          <li>• Case insensitive (will be converted to lowercase)</li>
        </ul>
      </div>
    </form>
  )
}