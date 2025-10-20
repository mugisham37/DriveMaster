import React from 'react'
import { Modal } from './Modal'

interface ExerciseUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  exerciseTitle: string
  updateDetails: string
}

export function ExerciseUpdateModal({
  isOpen,
  onClose,
  exerciseTitle,
  updateDetails,
}: ExerciseUpdateModalProps): React.JSX.Element {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="exercise-update-modal">
        <h2>Exercise Update Available</h2>
        <p>The exercise <strong>{exerciseTitle}</strong> has been updated.</p>
        
        <div className="update-details">
          <h3>What&apos;s Changed:</h3>
          <p>{updateDetails}</p>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Dismiss
          </button>
          <button type="button" onClick={onClose} className="btn-primary">
            View Changes
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ExerciseUpdateModal