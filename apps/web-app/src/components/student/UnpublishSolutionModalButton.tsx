import React, { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { inlineButtonClassNames } from './ChangePublishedIterationModalButton'

type Links = {
  unpublish: string
}

export type UnpublishSolutionModalButtonProps = {
  links: Links
  label: string
}

// Unpublish Solution Modal Component
const UnpublishSolutionModal = ({
  endpoint,
  open,
  onClose,
  className = '',
}: {
  endpoint: string
  open: boolean
  onClose: () => void
  className?: string
}) => {
  const { submit, isSubmitting } = useFormSubmission({
    endpoint,
    method: 'PATCH',
    onSuccess: () => {
      onClose()
      window.location.reload()
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({})
  }

  if (!open) return null

  return (
    <Modal onClose={onClose} className={className}>
      <div className="unpublish-solution-modal">
        <h2>Unpublish Solution</h2>
        <div className="content">
          <p>
            Are you sure you want to unpublish your solution? This will remove it from the community solutions list.
          </p>
          <p>
            You can republish it later if you change your mind.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Unpublishing...' : 'Unpublish Solution'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default function UnpublishSolutionModalButton({
  links,
  label,
}: UnpublishSolutionModalButtonProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        className={inlineButtonClassNames}
        onClick={() => setIsOpen(true)}
      >
        {label}
      </button>
      <UnpublishSolutionModal
        endpoint={links.unpublish}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="m-unpublish-solution"
      />
    </>
  )
}