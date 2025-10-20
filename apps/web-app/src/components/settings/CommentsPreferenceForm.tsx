'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface CommentsPreferenceFormProps {
  current_preference: boolean
  label: string
  num_published_solutions: number
  num_solutions_with_comments_enabled: number
  links: {
    update: string
    enable_comments_on_all_solutions: string
    disable_comments_on_all_solutions: string
  }
}

export default function CommentsPreferenceForm({
  current_preference,
  label,
  num_published_solutions,
  num_solutions_with_comments_enabled,
  links
}: CommentsPreferenceFormProps): React.JSX.Element {
  const [allowComments, setAllowComments] = useState(current_preference)

  const { submit: updatePreference, isSubmitting: isUpdatingPreference } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH',
    successMessage: 'Comment preference updated successfully!'
  })

  const { submit: enableAllComments, isSubmitting: isEnablingAll } = useFormSubmission({
    endpoint: links.enable_comments_on_all_solutions,
    method: 'PATCH',
    successMessage: 'Comments enabled on all published solutions!'
  })

  const { submit: disableAllComments, isSubmitting: isDisablingAll } = useFormSubmission({
    endpoint: links.disable_comments_on_all_solutions,
    method: 'PATCH',
    successMessage: 'Comments disabled on all published solutions!'
  })

  const handlePreferenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updatePreference({ allow_comments_on_published_solutions: allowComments })
  }

  const handleEnableAllComments = async () => {
    if (!confirm(`Enable comments on all ${num_published_solutions} published solutions?`)) {
      return
    }
    await enableAllComments({})
  }

  const handleDisableAllComments = async () => {
    if (!confirm(`Disable comments on all ${num_published_solutions} published solutions?`)) {
      return
    }
    await disableAllComments({})
  }

  const isAnySubmitting = isUpdatingPreference || isEnablingAll || isDisablingAll

  return (
    <div className="comments-preference-form">
      <h2 className="text-h3 mb-6">Solution Comments</h2>
      
      <form onSubmit={handlePreferenceSubmit} className="mb-8">
        <div className="preference-section mb-6">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="allow-comments"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className="form-checkbox mt-1"
            />
            <div>
              <label htmlFor="allow-comments" className="form-label cursor-pointer">
                {label}
              </label>
              <p className="text-textColor6 text-sm mt-1">
                When enabled, other users can leave comments on your published solutions. 
                This helps create discussions and learning opportunities.
              </p>
            </div>
          </div>
        </div>

        <div className="form-footer">
          <FormButton
            type="submit"
            disabled={isUpdatingPreference || allowComments === current_preference}
            className="btn-primary btn-m"
          >
            {isUpdatingPreference ? 'Saving...' : 'Save Preference'}
          </FormButton>
        </div>
      </form>

      {num_published_solutions > 0 && (
        <div className="bulk-actions">
          <h3 className="text-h4 mb-4">Manage Existing Solutions</h3>
          
          <div className="stats-summary mb-4 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="stat">
                <div className="text-h4 text-prominentLinkColor">
                  {num_published_solutions}
                </div>
                <div className="text-textColor6 text-sm">Published solutions</div>
              </div>
              <div className="stat">
                <div className="text-h4 text-prominentLinkColor">
                  {num_solutions_with_comments_enabled}
                </div>
                <div className="text-textColor6 text-sm">With comments enabled</div>
              </div>
            </div>
          </div>

          <div className="bulk-action-buttons flex gap-3">
            <FormButton
              onClick={handleEnableAllComments}
              disabled={isAnySubmitting}
              className="btn-secondary btn-m"
              type="button"
            >
              <GraphicalIcon icon="comment" className="mr-2" />
              {isEnablingAll ? 'Enabling...' : 'Enable Comments on All'}
            </FormButton>
            
            <FormButton
              onClick={handleDisableAllComments}
              disabled={isAnySubmitting}
              className="btn-secondary btn-m"
              type="button"
            >
              <GraphicalIcon icon="comment-off" className="mr-2" />
              {isDisablingAll ? 'Disabling...' : 'Disable Comments on All'}
            </FormButton>
          </div>

          <div className="bulk-actions-note mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-8">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> These actions will update all your published solutions at once. 
              You can still enable/disable comments on individual solutions from their pages.
            </p>
          </div>
        </div>
      )}

      <div className="comments-info mt-8 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h4 className="text-sm font-semibold mb-2">About Solution Comments:</h4>
        <ul className="text-sm text-textColor6 space-y-1">
          <li>• Comments help create learning discussions around your solutions</li>
          <li>• You can moderate comments on your solutions (edit, delete inappropriate ones)</li>
          <li>• Comments are public and visible to all Exercism users</li>
          <li>• You can change this setting for individual solutions at any time</li>
          <li>• Disabling comments won't delete existing comments, just prevent new ones</li>
        </ul>
      </div>
    </div>
  )
}