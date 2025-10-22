import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FormButton } from './forms/FormButton'
import { ErrorBoundary, ErrorMessage } from '../ErrorBoundary'
import { sendRequest } from '@/utils/send-request'
import { typecheck } from '@/utils'

interface EditListItemFormProps<T extends { content?: string; links: { edit?: string; delete?: string } }> {
  item: T
  onUpdate: (item: T) => void
  onDelete: (item: T) => void
  onCancel: () => void
  defaultError: Error
}

export function EditListItemForm<T extends { content?: string; links: { edit?: string; delete?: string } }>({
  item,
  onUpdate,
  onDelete,
  onCancel,
  defaultError,
}: EditListItemFormProps<T>): JSX.Element {
  const [content, setContent] = useState(item.content || '')

  const {
    mutate: updateItem,
    status: updateStatus,
    error: updateError,
  } = useMutation<T>({
    mutationFn: async () => {
      if (!item.links.edit) throw new Error('No edit link available')
      
      const { fetch } = sendRequest({
        endpoint: item.links.edit,
        method: 'PATCH',
        body: JSON.stringify({ content }),
      })

      return fetch.then((json) => typecheck<T>(json, 'edit'))
    },
    onSuccess: (updatedItem) => {
      onUpdate(updatedItem)
    },
  })

  const {
    mutate: deleteItem,
    status: deleteStatus,
    error: deleteError,
  } = useMutation<void>({
    mutationFn: async () => {
      if (!item.links.delete) throw new Error('No delete link available')
      
      const { fetch } = sendRequest({
        endpoint: item.links.delete,
        method: 'DELETE',
        body: null,
      })

      return fetch
    },
    onSuccess: () => {
      onDelete(item)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim()) {
      updateItem()
    }
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteItem()
    }
  }

  const isLoading = updateStatus === 'pending' || deleteStatus === 'pending'
  const error = updateError || deleteError

  return (
    <form onSubmit={handleSubmit} className="edit-list-item-form">
      <div className="form-group">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="form-control"
          rows={4}
          required
        />
      </div>
      
      <div className="form-actions">
        <FormButton
          type="submit"
          disabled={!content.trim() || isLoading}
          isLoading={updateStatus === 'pending'}
          className="btn-primary btn-s"
        >
          {updateStatus === 'pending' ? 'Updating...' : 'Update'}
        </FormButton>
        
        {item.links.delete && (
          <FormButton
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            isLoading={deleteStatus === 'pending'}
            className="btn-secondary btn-s"
          >
            {deleteStatus === 'pending' ? 'Deleting...' : 'Delete'}
          </FormButton>
        )}
        
        <FormButton
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="btn-secondary btn-s"
        >
          Cancel
        </FormButton>
      </div>

      {error && (
        <ErrorBoundary>
          <ErrorMessage error={error} defaultError={defaultError} />
        </ErrorBoundary>
      )}
    </form>
  )
}

export default EditListItemForm