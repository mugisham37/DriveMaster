'use client'

import { useState } from 'react'
import { Modal } from '@/components/common'
import { TrackIcon } from '@/components/common/TrackIcon'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'

interface Track {
  slug: string
  title: string
  iconUrl: string
  numCompletedExercises: number
  numExercises: number
}

interface TrackResetModalProps {
  track: Track
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TrackResetModal({ track, isOpen, onClose, onSuccess }: TrackResetModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const [resetOptions, setResetOptions] = useState({
    resetProgress: true,
    resetSolutions: true,
    resetMentoring: false
  })
  
  const { submit, isSubmitting, error } = useFormSubmission({
    endpoint: `/api/tracks/${track.slug}/reset`,
    method: 'POST',
    onSuccess: () => {
      onSuccess?.()
      onClose()
    },
    successMessage: `Your progress in ${track.title} has been reset`
  })

  const handleSubmit = async () => {
    if (confirmText.toLowerCase() === 'reset') {
      await submit(resetOptions)
    }
  }

  const isConfirmValid = confirmText.toLowerCase() === 'reset'

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      className="track-reset-modal"
      ReactModalClassName="max-w-[500px]"
    >
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <TrackIcon 
            iconUrl={track.iconUrl}
            title={track.title}
            className="w-12 h-12"
          />
          <div>
            <h2 className="text-h2">Reset {track.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {track.numCompletedExercises} of {track.numExercises} exercises completed
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
            ⚠️ Warning: This will reset your progress
          </h3>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Choose what you want to reset. This action cannot be undone.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <h3 className="font-semibold">Reset Options:</h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={resetOptions.resetProgress}
                onChange={(e) => setResetOptions(prev => ({
                  ...prev,
                  resetProgress: e.target.checked
                }))}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <div className="font-medium">Exercise Progress</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Reset completion status for all exercises (you&apos;ll keep your solutions)
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={resetOptions.resetSolutions}
                onChange={(e) => setResetOptions(prev => ({
                  ...prev,
                  resetSolutions: e.target.checked
                }))}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <div className="font-medium">Solutions & Iterations</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Delete all your solutions and start fresh
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={resetOptions.resetMentoring}
                onChange={(e) => setResetOptions(prev => ({
                  ...prev,
                  resetMentoring: e.target.checked
                }))}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <div className="font-medium">Mentoring History</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Close all mentoring discussions (not recommended)
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="confirm-text" className="block text-sm font-medium mb-2">
            Type &quot;<strong>reset</strong>&quot; to confirm:
          </label>
          <input
            type="text"
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:bg-gray-700"
            placeholder="reset"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-m btn-default"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <FormButton
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!isConfirmValid}
            className="btn-m btn-destructive"
          >
            Reset Track
          </FormButton>
        </div>
      </div>
    </Modal>
  )
}

export default TrackResetModal