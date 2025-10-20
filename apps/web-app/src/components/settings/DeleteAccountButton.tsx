'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { InputWithValidation } from '@/components/common/forms/InputWithValidation'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { Modal } from '@/components/common/Modal'

interface DeleteAccountButtonProps {
  handle: string
  links: {
    delete: string
  }
}

export default function DeleteAccountButton({
  handle,
  links
}: DeleteAccountButtonProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [password, setPassword] = useState('')

  const { submit, isSubmitting, error } = useFormSubmission({
    endpoint: links.delete,
    method: 'DELETE',
    onSuccess: () => {
      // Redirect to home page after successful deletion
      window.location.href = '/'
    }
  })

  const handleDeleteAccount = async () => {
    await submit({
      confirmation: confirmationText,
      password: password
    })
  }

  const canDelete = confirmationText === `DELETE ${handle}` && password.length > 0
  const expectedConfirmation = `DELETE ${handle}`

  return (
    <>
      <div className="delete-account-section">
        <h2 className="text-h3 mb-6 text-red-600">Danger Zone</h2>
        
        <div className="danger-box p-6 bg-red-50 border-2 border-red-200 rounded-8">
          <div className="flex items-start gap-4">
            <GraphicalIcon icon="warning" className="text-red-600 text-xl mt-1" />
            <div className="flex-1">
              <h3 className="text-h4 text-red-800 mb-2">Delete Account</h3>
              <p className="text-red-700 text-sm mb-4">
                Permanently delete your Exercism account and all associated data. 
                This action cannot be undone.
              </p>
              
              <FormButton
                onClick={() => setIsModalOpen(true)}
                className="btn-destructive btn-m"
                type="button"
              >
                <GraphicalIcon icon="trash" className="mr-2" />
                Delete My Account
              </FormButton>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="delete-account-modal"
      >
        <div className="modal-content p-6 max-w-md">
          <div className="modal-header mb-6">
            <div className="flex items-center gap-3 mb-4">
              <GraphicalIcon icon="warning" className="text-red-600 text-2xl" />
              <h2 className="text-h3 text-red-600">Delete Account</h2>
            </div>
            <p className="text-textColor2">
              This will permanently delete your account and all associated data.
            </p>
          </div>

          <div className="deletion-consequences mb-6 p-4 bg-red-50 border border-red-200 rounded-8">
            <h4 className="text-red-800 font-semibold mb-2">What will be deleted:</h4>
            <ul className="text-red-700 text-sm space-y-1">
              <li>• Your profile and all personal information</li>
              <li>• All your solutions and iterations</li>
              <li>• Your progress on all tracks</li>
              <li>• All mentoring discussions and feedback</li>
              <li>• Your reputation and badges</li>
              <li>• All comments and community interactions</li>
            </ul>
          </div>

          <div className="confirmation-form space-y-4">
            <div className="form-group">
              <label htmlFor="confirmation" className="form-label text-red-700">
                Type <code className="bg-red-100 px-1 rounded">{expectedConfirmation}</code> to confirm:
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
              <label htmlFor="password" className="form-label text-red-700">
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

          <div className="modal-actions mt-6 flex gap-3">
            <FormButton
              onClick={handleDeleteAccount}
              disabled={!canDelete || isSubmitting}
              className="btn-destructive btn-m flex-1"
              type="button"
            >
              {isSubmitting ? 'Deleting Account...' : 'Delete My Account Forever'}
            </FormButton>
            
            <FormButton
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary btn-m"
              type="button"
            >
              Cancel
            </FormButton>
          </div>

          <div className="final-warning mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs text-center">
            This action is permanent and cannot be undone. All your data will be lost forever.
          </div>
        </div>
      </Modal>
    </>
  )
}