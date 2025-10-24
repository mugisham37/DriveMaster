import React from 'react'

interface DeleteFileModalProps {
  onDelete: () => void
  onCancel: () => void
  filename: string
  isOpen: boolean
}

export const DeleteFileModal: React.FC<DeleteFileModalProps> = ({
  onDelete,
  onCancel,
  filename,
  isOpen,
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Delete File</h3>
        <p>Are you sure you want to delete {filename}?</p>
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onDelete} className="btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}