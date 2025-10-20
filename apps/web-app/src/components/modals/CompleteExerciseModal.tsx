import React from 'react'
import { Modal } from '../common'

interface Iteration {
  idx: number
  uuid: string
  submissionUuid: string
  createdAt: string
  testsStatus: string
  representationStatus: string
  analysisStatus: string
  isPublished: boolean
}

interface CompleteExerciseModalProps {
  endpoint: string
  iterations: readonly Iteration[]
  open: boolean
  onClose: () => void
}

export function CompleteExerciseModal({
  endpoint,
  iterations,
  open,
  onClose,
}: CompleteExerciseModalProps): React.JSX.Element {
  const handleComplete = async () => {
    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ completed: true }),
      })

      if (response.ok) {
        onClose()
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to complete exercise:', error)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="complete-exercise-modal p-6">
        <h2 className="text-xl font-bold mb-4">Complete Exercise</h2>
        <p className="mb-4">
          Are you sure you want to mark this exercise as complete?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            className="btn-primary"
          >
            Complete Exercise
          </button>
        </div>
      </div>
    </Modal>
  )
}