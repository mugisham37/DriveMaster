import React, { useState } from 'react'
import Modal from './Modal'

interface RequestMentoringModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RequestMentoringModal({
  isOpen,
  onClose,
}: RequestMentoringModalProps): React.JSX.Element {
  const [comment, setComment] = useState('')

  const handleRequest = async () => {
    try {
      // Implementation would go here
      console.log('Requesting mentoring with comment:', comment)
      onClose()
    } catch (error) {
      console.error('Failed to request mentoring:', error)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="request-mentoring-modal">
        <h2>Request Mentoring</h2>
        <p>Add a comment to help your mentor understand what you need help with:</p>
        
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What would you like help with?"
          rows={4}
          className="w-full p-2 border rounded"
        />

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleRequest} className="btn-primary">
            Request Mentoring
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default RequestMentoringModal