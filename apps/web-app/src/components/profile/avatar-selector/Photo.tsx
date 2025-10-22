import React from 'react'
import { User } from '../../../types'

interface PhotoProps {
  user: User
  onAttach: (file: File) => void
  onDelete: (user: User) => void
  links: {
    update: string
    delete: string
  }
}

export function Photo({ user, onAttach, onDelete, links }: PhotoProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onAttach(file)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(links.delete, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const updatedUser = await response.json()
        onDelete(updatedUser)
      }
    } catch (error) {
      console.error('Failed to delete avatar:', error)
    }
  }

  return (
    <div className="avatar-photo">
      <div className="current-photo mb-4">
        <img
          src={user.avatarUrl}
          alt={user.handle}
          className="w-24 h-24 rounded-full object-cover"
        />
      </div>
      
      <div className="photo-actions space-y-2">
        <label className="btn-primary btn-s cursor-pointer">
          Upload New Photo
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        
        {user.hasAvatar && (
          <button
            onClick={handleDelete}
            className="btn-secondary btn-s"
          >
            Remove Photo
          </button>
        )}
      </div>
    </div>
  )
}