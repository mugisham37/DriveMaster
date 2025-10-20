import React, { useState } from 'react'
import Modal from '@/components/modals/Modal'
import { useFormSubmission } from '@/hooks/useFormSubmission'

export type RedirectType = 'exercise' | 'solution'

type Links = {
  changeIteration: string
}

export type ChangePublishedIterationModalButtonProps = {
  redirectType: RedirectType
  publishedIterationIdx: number | null
  iterations: readonly {
    idx: number
    uuid: string
    submissionUuid: string
    createdAt: string
    testsStatus: string
    representationStatus: string
    analysisStatus: string
    isPublished: boolean
    files: Array<{
      filename: string
      content: string
    }>
    links: {
      self: string
      tests: string
      delete?: string
    }
  }[]
  links: Links
  label: string
}

export const inlineButtonClassNames =
  'inline-block text-prominentLinkColor border-b-1 border-prominentLinkColor font-medium'

// Change Published Iteration Modal Component
const ChangePublishedIterationModal = ({
  endpoint,
  redirectType,
  iterations,
  defaultIterationIdx,
  open,
  onClose,
  className = '',
}: {
  endpoint: string
  redirectType: RedirectType
  iterations: ChangePublishedIterationModalButtonProps['iterations']
  defaultIterationIdx: number | null
  open: boolean
  onClose: () => void
  className?: string
}) => {
  const [selectedIterationIdx, setSelectedIterationIdx] = useState(
    defaultIterationIdx || iterations[0]?.idx || 1
  )

  const { submit, isSubmitting } = useFormSubmission({
    endpoint,
    method: 'PATCH',
    onSuccess: () => {
      onClose()
      // Redirect based on redirectType
      if (redirectType === 'exercise') {
        window.location.reload()
      }
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({ iteration_idx: selectedIterationIdx })
  }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} className={className}>
      <div className="change-published-iteration-modal">
        <h2>Change Published Iteration</h2>
        <form onSubmit={handleSubmit}>
          <div className="iterations-list">
            {iterations.map((iteration) => (
              <label key={iteration.idx} className="iteration-option">
                <input
                  type="radio"
                  name="iteration"
                  value={iteration.idx}
                  checked={selectedIterationIdx === iteration.idx}
                  onChange={(e) => setSelectedIterationIdx(Number(e.target.value))}
                />
                <span>Iteration {iteration.idx}</span>
                <span className="created-at">
                  {new Date(iteration.createdAt).toLocaleDateString()}
                </span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Changing...' : 'Change Published Iteration'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default function ChangePublishedIterationModalButton({
  redirectType,
  publishedIterationIdx,
  iterations,
  links,
  label,
}: ChangePublishedIterationModalButtonProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        className={inlineButtonClassNames}
        onClick={() => setIsOpen(true)}
      >
        {label}
      </button>
      <ChangePublishedIterationModal
        endpoint={links.changeIteration}
        redirectType={redirectType}
        iterations={iterations}
        defaultIterationIdx={publishedIterationIdx}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="m-change-published-iteration"
      />
    </>
  )
}