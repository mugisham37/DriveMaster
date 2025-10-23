import React, { useState } from 'react'
import { DiffViewer } from './DiffViewer'

interface ExerciseDiff {
  files: Array<{
    relativePath: string
    diff: string
  }>
  links: {
    update: string
  }
}

export const ExerciseUpdateForm = ({
  diff,
  onCancel,
}: {
  diff: ExerciseDiff
  onCancel: () => void
}): React.JSX.Element => {
  const [selectedFile, setSelectedFile] = useState(diff.files[0]?.relativePath || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      // In a real implementation, this would make an API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Exercise updated successfully')
    } catch (error) {
      console.error('Failed to update exercise:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const selectedFileData = diff.files.find(file => file.relativePath === selectedFile)

  return (
    <div className="exercise-update-form">
      <div className="form-header">
        <h2>Exercise Update</h2>
        <p>Review the changes and update your exercise.</p>
      </div>
      
      {diff.files.length > 1 && (
        <div className="file-tabs">
          {diff.files.map((file) => (
            <button
              key={file.relativePath}
              onClick={() => setSelectedFile(file.relativePath)}
              className={`file-tab ${selectedFile === file.relativePath ? 'active' : ''}`}
            >
              {file.relativePath}
            </button>
          ))}
        </div>
      )}
      
      {selectedFileData && (
        <div className="diff-container">
          <DiffViewer diff={selectedFileData.diff} />
        </div>
      )}
      
      <div className="form-actions">
        <button
          onClick={onCancel}
          className="btn-secondary"
          disabled={isUpdating}
        >
          Cancel
        </button>
        <button
          onClick={handleUpdate}
          className="btn-primary"
          disabled={isUpdating}
        >
          {isUpdating ? 'Updating...' : 'Update Exercise'}
        </button>
      </div>
    </div>
  )
}