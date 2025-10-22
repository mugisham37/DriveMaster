'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { InputWithValidation } from '@/components/common/forms/InputWithValidation'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { Modal } from '@/components/common/Modal'

interface ResetAccountButtonProps {
  handle: string
  links: {
    reset: string
  }
}

export default function ResetAccountButton({
  handle,
  links
}: ResetAccountButtonProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [password, setPassword] = useState('')

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.reset,
    method: 'POST',
    onSuccess: () => {
      setIsModalOpen(false)
      setConfirmationText('')
      setPassword('')
      // Optionally redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    }
  })

  const handleResetAccount = async () => {
    await submit({
      confirmation: confirmationText,
      password: password
    })
  }

  const canReset = confirmationText === `RESET ${handle}` && password.length > 0
  const expectedConfirmation = `RESET ${handle}`

  return (
    <>
      <div className="reset-account-section">
        <h3 className="text-h4 mb-4 text-orange-600">Reset Progress</h3>
        
        <div className="warning-box p-4 bg-orange-50 border border-orange-200 rounded-8">
          <div className="flex items-start gap-3">
            <GraphicalIcon icon="refresh" className="text-orange-600 mt-1" />
            <div className="flex-1">
              <p className="text-orange-700 text-sm mb-3">
                Reset your learning progress while keeping your profile and account. 
                This will remove all your solutions and track progress.
              </p>
              
              <FormButton
                onClick={() => setIsModalOpen(true)}
                className="btn-warning btn-m"
                type="button"
              >
                <GraphicalIcon icon="refresh" className="mr-2" />
                Reset My Progress
              </FormButton>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="reset-account-modal"
      >
        <div className="modal-content p-6 max-w-md">
          <div className="modal-header mb-6">
            <div className="flex items-center gap-3 mb-4">
              <GraphicalIcon icon="refresh" className="text-orange-600 text-2xl" />
              <h2 className="text-h3 text-orange-600">Reset Account Progress</h2>
            </div>
            <p className="text-textColor2">
              This will reset your learning progress while keeping your profile intact.
            </p>
          </div>

          <div className="reset-consequences mb-6">
            <div className="will-be-reset mb-4 p-4 bg-orange-50 border border-orange-200 rounded-8">
              <h4 className="text-orange-800 font-semibold mb-2">What will be reset:</h4>
              <ul className="text-orange-700 text-sm space-y-1">
                <li>• All your solutions and iterations</li>
                <li>• Your progress on all tracks</li>
                <li>• All mentoring discussions (as a student)</li>
                <li>• Exercise completion status</li>
                <li>• Learning mode progress</li>
              </ul>
            </div>

            <div className="will-be-kept p-4 bg-green-50 border border-green-200 rounded-8">
              <h4 className="text-green-800 font-semibold mb-2">What will be kept:</h4>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Your profile and personal information</li>
                <li>• Your reputation and badges</li>
                <li>• Your mentoring activities (as a mentor)</li>
                <li>• Community contributions and comments</li>
                <li>• Account settings and preferences</li>
              </ul>
            </div>
          </div>

          <div className="confirmation-form space-y-4">
            <div className="form-group">
              <label htmlFor="confirmation" className="form-label text-orange-700">
                Type <code className="bg-orange-100 px-1 rounded">{expectedConfirmation}</code> to confirm:
              </label>
              <InputWithValidation
                id="confirmation"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={expectedConfirmation}
                className="form-input"
                error={confirmationText && confirmationText !== expectedConfirmation ? 'Confirmation text does not match' : undefined}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label text-orange-700">
                Enter your password to confirm:
              </label>
              <InputWithValidation
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
                className="form-input"
              />
            </div>
          </div>

          {error && (
            <div className="error-message mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              {error.message}
            </div>
          )}

          {isSuccess && (
            <div className="success-message mt-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">
              Account progress reset successfully! Redirecting to dashboard...
            </div>
          )}

          <div className="modal-actions mt-6 flex gap-3">
            <FormButton
              onClick={handleResetAccount}
              disabled={!canReset || isSubmitting}
              className="btn-warning btn-m flex-1"
              type="button"
            >
              {isSubmitting ? 'Resetting Progress...' : 'Reset My Progress'}
            </FormButton>
            
            <FormButton
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary btn-m"
              type="button"
            >
              Cancel
            </FormButton>
          </div>

          <div className="reset-note mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs text-center">
            You can start fresh on any track after resetting. Your mentor reputation and community contributions remain intact.
          </div>
        </div>
      </Modal>
    </>
  )
}