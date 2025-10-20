'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface ShowOnSupportersPageButtonProps {
  value: boolean
  links: {
    update: string
  }
}

export default function ShowOnSupportersPageButton({
  value: initialValue,
  links
}: ShowOnSupportersPageButtonProps): React.JSX.Element {
  const [showOnSupportersPage, setShowOnSupportersPage] = useState(initialValue)

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH',
    successMessage: 'Supporters page preference updated successfully!'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({ show_on_supporters_page: showOnSupportersPage })
  }

  return (
    <form onSubmit={handleSubmit} className="supporters-page-form">
      <h2 className="text-h3 mb-6">Supporters Page</h2>
      
      <div className="supporters-info mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <div className="flex items-start gap-3">
          <GraphicalIcon icon="heart" className="text-red-500 text-xl mt-1" />
          <div>
            <h3 className="text-h4 mb-2">Show Your Support</h3>
            <p className="text-textColor2 mb-3">
              If you've donated to Exercism, you can choose to be featured on our 
              public supporters page to show your commitment to free coding education.
            </p>
            <p className="text-textColor6 text-sm">
              This will display your name and donation amount (if you choose) on our 
              supporters page, helping inspire others to contribute.
            </p>
          </div>
        </div>
      </div>

      <div className="preference-section mb-6">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={showOnSupportersPage}
            onChange={(e) => setShowOnSupportersPage(e.target.checked)}
            className="form-checkbox mt-1"
          />
          <div>
            <div className="preference-label font-medium text-textColor2 mb-1">
              Show me on the supporters page
            </div>
            <div className="preference-description text-sm text-textColor6">
              Display your name on our public supporters page to inspire others 
              and show your commitment to free coding education.
            </div>
          </div>
        </label>
      </div>

      <div className="form-footer">
        <FormButton
          type="submit"
          disabled={isSubmitting || showOnSupportersPage === initialValue}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Saving...' : 'Save Preference'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">
            {showOnSupportersPage 
              ? 'You will now appear on the supporters page!' 
              : 'You have been removed from the supporters page.'
            }
          </span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      <div className="supporters-note mt-6 p-4 bg-blue-50 border border-blue-200 rounded-8">
        <h4 className="text-blue-800 font-semibold mb-2">Privacy Notes:</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Only your name/handle will be displayed publicly</li>
          <li>• Donation amounts are only shown if you explicitly opt-in</li>
          <li>• You can change this preference at any time</li>
          <li>• This only applies if you have made donations to Exercism</li>
        </ul>
      </div>
    </form>
  )
}