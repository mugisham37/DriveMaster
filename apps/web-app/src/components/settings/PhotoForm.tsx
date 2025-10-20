'use client'

import React, { useState, useRef } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { Avatar } from '@/components/common/Avatar'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface PhotoFormProps {
  user: {
    avatar_url: string
    has_avatar: boolean
    handle: string
  }
  links: {
    update: string
    delete: string
  }
}

export default function PhotoForm({
  user,
  links
}: PhotoFormProps): React.JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { submit: uploadPhoto, isSubmitting: isUploading, error: uploadError } = useFormSubmission({
    endpoint: links.update,
    method: 'PATCH',
    successMessage: 'Profile photo updated successfully!'
  })

  const { submit: deletePhoto, isSubmitting: isDeleting, error: deleteError } = useFormSubmission({
    endpoint: links.delete,
    method: 'DELETE',
    successMessage: 'Profile photo removed successfully!'
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('avatar', selectedFile)

    await uploadPhoto(formData)
    
    // Clear selection on success
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) {
      return
    }
    
    await deletePhoto({})
  }

  const handleChooseFile = () => {
    fileInputRef.current?.click()
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="photo-form">
      <h2 className="text-h3 mb-6">Profile Photo</h2>
      
      <div className="current-photo mb-6">
        <h3 className="text-h4 mb-4">Current Photo</h3>
        <div className="flex items-center gap-4">
          <Avatar
            src={user.avatar_url}
            handle={user.handle}
            size="large"
            className="w-20 h-20"
          />
          <div>
            <p className="text-textColor2 mb-2">
              {user.has_avatar ? 'Custom profile photo' : 'Default avatar'}
            </p>
            {user.has_avatar && (
              <FormButton
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-secondary btn-xs"
                type="button"
              >
                <GraphicalIcon icon="trash" className="mr-2" />
                {isDeleting ? 'Removing...' : 'Remove Photo'}
              </FormButton>
            )}
          </div>
        </div>
      </div>

      {selectedFile && previewUrl && (
        <div className="photo-preview mb-6">
          <h3 className="text-h4 mb-4">Preview</h3>
          <div className="flex items-center gap-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-20 h-20 rounded-full object-cover border-2 border-borderColor6"
            />
            <div>
              <p className="text-textColor2 mb-2">New profile photo</p>
              <p className="text-textColor6 text-sm">
                {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="upload-section">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="upload-area">
            <FormButton
              onClick={handleChooseFile}
              className="btn-primary btn-m"
              type="button"
            >
              <GraphicalIcon icon="upload" className="mr-2" />
              Choose New Photo
            </FormButton>
          </div>
        ) : (
          <div className="upload-actions flex gap-3">
            <FormButton
              onClick={handleUpload}
              disabled={isUploading}
              className="btn-primary btn-m"
              type="button"
            >
              {isUploading ? 'Uploading...' : 'Upload Photo'}
            </FormButton>
            <FormButton
              onClick={handleCancel}
              className="btn-secondary btn-m"
              type="button"
            >
              Cancel
            </FormButton>
          </div>
        )}
      </div>

      {(uploadError || deleteError) && (
        <div className="error-message mt-4">
          <span className="text-red-600">
            Error: {uploadError?.message || deleteError?.message}
          </span>
        </div>
      )}

      <div className="photo-requirements mt-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h4 className="text-sm font-semibold mb-2">Photo Requirements:</h4>
        <ul className="text-sm text-textColor6 space-y-1">
          <li>• Supported formats: JPG, PNG, GIF, WebP</li>
          <li>• Maximum file size: 5MB</li>
          <li>• Recommended: Square images (1:1 ratio)</li>
          <li>• Minimum resolution: 200x200 pixels</li>
          <li>• Photos should be appropriate for a professional environment</li>
        </ul>
      </div>
    </div>
  )
}