'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { Modal } from '@/components/common/Modal'

interface DeleteProfileFormProps {
  links: {
    delete: string
  }
}

export default function DeleteProfileForm({
  links
}: DeleteProfileFormProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirmationChecked, setConfirmationChecked] = useState(false)

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.delete,
    method: 'DELETE',
    successMessage: 'Profile deleted successfully!',
    onSuccess: () => {
      setIsModalOpen(false)
      setConfirmationChecked(false)
    }
  })

  const handleDeleteProfile = async () => {
    await submit({})
  }

  return (
    <>
      <div className="delete-profile-section">
        <h3 className="text-h4 mb-4 text-orange-600">Delete Profile</h3>
        
        <div className="warning-box p-4 bg-orange-50 border border-orange-200 rounded-8">
          <div className="flex items-start gap-3">
            <GraphicalIcon icon="user-x" className="text-orange-600 mt-1" />
            <div className="flex-1">
              <p className="text-orange-700 text-sm mb-3">
                Delete your public profile while keeping your account active. 
                This will remove your profile information but preserve your learning progress.
              </p>
              
              <FormButton
                onClick={() => setIsModalOpen(true)}
                className="btn-warning btn-m"
                type="button"
              >
                <GraphicalIcon icon="user-x" className="mr-2" />
                Delete My Profile
              </FormButton>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="delete-profile-modal"
      >
        <div className="modal-content p-6 max-w-md">
          <div className="modal-header mb-6">
            <div className="flex items-center gap-3 mb-4">
              <GraphicalIcon icon="user-x" className="text-orange-600 text-2xl" />
              <h2 className="text-h3 text-orange-600">Delete Profile</h2>
            </div>
            <p className="text-textColor2">
              This will delete your public profile while keeping your account and progress intact.
            </p>
          </div>

          <div className="deletion-consequences mb-6">
            <div className="will-be-deleted mb-4 p-4 bg-orange-50 border border-orange-200 rounded-8">
              <h4 className="text-orange-800 font-semibold mb-2">What will be deleted:</h4>
              <ul className="text-orange-700 text-sm space-y-1">
                <li>• Your public profile page</li>
                <li>• Profile bio and personal information</li>
                <li>• Social media links</li>
                <li>• Profile photo</li>
                <li>• Public visibility of your solutions</li>
              </ul>
            </div>

            <div className="will-be-kept p-4 bg-green-50 border border-green-200 rounded-8">
              <h4 className="text-green-800 font-semibold mb-2">What will be kept:</h4>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Your account and login credentials</li>
                <li>• All your solutions and progress</li>
                <li>• Your reputation and badges</li>
                <li>• Mentoring activities and discussions</li>
                <li>• Account settings and preferences</li>
              </ul>
            </div>
          </div>

          <div className="confirmation-section mb-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={confirmationChecked}
                onChange={(e) => setConfirmationChecked(e.target.checked)}
                className="form-checkbox mt-1"
              />
              <div className="text-sm">
                <div className="font-medium text-textColor2 mb-1">
                  I understand the consequences
                </div>
                <div className="text-textColor6">
                  I understand that deleting my profile will remove my public presence 
                  on Exercism while keeping my account and progress intact.
                </div>
              </div>
            </label>
          </div>

          {error && (
            <div className="error-message mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              {error.message}
            </div>
          )}

          {isSuccess && (
            <div className="success-message mt-4 p-3 bg-green-100 border border-green-300 rounded text-green-700 text-sm">
              Profile deleted successfully! Your account and progress remain intact.
            </div>
          )}

          <div className="modal-actions mt-6 flex gap-3">
            <FormButton
              onClick={handleDeleteProfile}
              disabled={!confirmationChecked || isSubmitting}
              className="btn-warning btn-m flex-1"
              type="button"
            >
              {isSubmitting ? 'Deleting Profile...' : 'Delete My Profile'}
            </FormButton>
            
            <FormButton
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary btn-m"
              type="button"
            >
              Cancel
            </FormButton>
          </div>

          <div className="profile-note mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs text-center">
            You can recreate your profile at any time by visiting your settings and adding profile information.
          </div>
        </div>
      </Modal>
    </>
  )
}