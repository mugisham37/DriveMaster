import React, { useState } from 'react'
import Modal from './Modal'
import { Iteration } from '../types'

interface PublishSolutionModalProps {
  isOpen: boolean
  onClose: () => void
  endpoint: string
  iterations: readonly Iteration[]
}

export function PublishSolutionModal({
  isOpen,
  onClose,
  endpoint,
  iterations,
}: PublishSolutionModalProps): React.JSX.Element {
  const [selectedIteration, setSelectedIteration] = useState<number>(
    iterations.length > 0 ? iterations[iterations.length - 1]?.idx || 1 : 1
  )

  const handlePublish = async () => {
    try {
      // Implementation would go here
      console.log('Publishing iteration:', selectedIteration)
      onClose()
    } catch (error) {
      console.error('Failed to publish solution:', error)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="publish-solution-modal">
        <h2>Publish Solution</h2>
        <p>Select which iteration you want to publish:</p>
        
        <select
          value={selectedIteration}
          onChange={(e) => setSelectedIteration(Number(e.target.value))}
        >
          {iterations.map((iteration) => (
            <option key={iteration.idx} value={iteration.idx}>
              Iteration {iteration.idx}
            </option>
          ))}
        </select>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handlePublish} className="btn-primary">
            Publish
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default PublishSolutionModal