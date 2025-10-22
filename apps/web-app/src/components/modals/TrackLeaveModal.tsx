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

interface TrackLeaveModalProps {
  track: Track
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TrackLeaveModal({ track, isOpen, onClose, onSuccess }: TrackLeaveModalProps) {
  const [confirmText, setConfirmText] = useState('')
  
  const { submit, isSubmitting, error } = useFormSubmission({
    endpoint: `/api/tracks/${track.slug}/leave`,
    method: 'DELETE',
    onSuccess: () => {
      onSuccess?.()
      onClose()
    },
    successMessage: `You have successfully left the ${track.title} track`
  })

  const handleSubmit = async () => {
    if (confirmText.toLowerCase() === track.title.toLowerCase()) {
      await submit({})
    }
  }

  const isConfirmValid = confirmText.toLowerCase() === track.title.toLowerCase()

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      className="track-leave-modal"
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
            <h2 className="text-h2">Leave {track.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {track.numCompletedExercises} of {track.numExercises} exercises completed
            </p>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">
            ⚠️ Warning: This action cannot be undone
          </h3>
          <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
            <li>• You will lose access to all exercises in this track</li>
            <li>• Your solutions and progress will be permanently deleted</li>
            <li>• Any ongoing mentoring discussions will be closed</li>
            <li>• You will need to rejoin the track to continue learning</li>
          </ul>
        </div>

        <div className="mb-6">
          <label htmlFor="confirm-text" className="block text-sm font-medium mb-2">
            Type &quot;<strong>{track.title}</strong>&quot; to confirm:
          </label>
          <input
            type="text"
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700"
            placeholder={track.title}
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
            Leave Track
          </FormButton>
        </div>
      </div>
    </Modal>
  )
}

export default TrackLeaveModal