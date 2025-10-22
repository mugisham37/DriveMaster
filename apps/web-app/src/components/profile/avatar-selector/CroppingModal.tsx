import React, { useState } from 'react'
import { Modal } from '@/components/common'
import { User } from '../../../types'

interface CroppingModalProps {
  isOpen: boolean
  onClose: () => void
  imageFile?: File | undefined
  links: {
    update: string
    delete: string
  }
  onUpload: (user: User) => void
}

export function CroppingModal({ 
  isOpen, 
  onClose, 
  imageFile, 
  links, 
  onUpload 
}: CroppingModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [imageFile])

  const handleUpload = async () => {
    if (!imageFile) return

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('avatar', imageFile)

      const response = await fetch(links.update, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const updatedUser = await response.json()
        onUpload(updatedUser)
        onClose()
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} className="cropping-modal">
      <div className="p-6">
        <h2 className="text-h2 mb-4">Crop Your Photo</h2>
        
        {previewUrl && (
          <div className="preview mb-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full h-auto rounded"
            />
          </div>
        )}
        
        <div className="actions flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="btn-secondary btn-m"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="btn-primary btn-m"
            disabled={isUploading || !imageFile}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </Modal>
  )
}