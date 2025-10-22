import React, { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FormButton } from './forms/FormButton'
import { ErrorBoundary, ErrorMessage } from '../ErrorBoundary'
import { sendRequest } from '@/utils/send-request'
import { typecheck } from '@/utils'

interface NewListItemFormProps<T> {
  endpoint: string
  expanded?: boolean
  contextId: string
  onSuccess: (item: T) => void
  defaultError: Error
}

export function NewListItemForm<T>({
  endpoint,
  expanded = false,
  contextId,
  onSuccess,
  defaultError,
}: NewListItemFormProps<T>): JSX.Element {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    mutate: submitForm,
    status,
    error,
  } = useMutation<T>({
    mutationFn: async () => {
      const { fetch } = sendRequest({
        endpoint,
        method: 'POST',
        body: JSON.stringify({ content }),
      })

      return fetch.then((json) => typecheck<T>(json, contextId))
    },
    onSuccess: (item) => {
      setContent('')
      onSuccess(item)
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim()) {
      submitForm()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="new-list-item-form">
      <div className="form-group">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your comment..."
          className="form-control"
          rows={expanded ? 4 : 2}
          required
        />
      </div>
      
      <div className="form-actions">
        <FormButton
          type="submit"
          disabled={!content.trim() || status === 'pending'}
          isLoading={status === 'pending'}
          className="btn-primary btn-s"
        >
          {status === 'pending' ? 'Posting...' : 'Post Comment'}
        </FormButton>
      </div>

      {status === 'error' && (
        <ErrorBoundary>
          <ErrorMessage error={error} defaultError={defaultError} />
        </ErrorBoundary>
      )}
    </form>
  )
}

export default NewListItemForm