import React, { useState, useCallback } from 'react'
import { GraphicalIcon } from '../common'
import { CompleteExerciseModal } from '../modals/CompleteExerciseModal'
import { useAppTranslation } from '@/i18n/useAppTranslation'

interface Iteration {
  idx: number
  uuid: string
  submissionUuid: string
  createdAt: string
  testsStatus: string
  representationStatus: string
  analysisStatus: string
  isPublished: boolean
}

export default function CompleteExerciseButton({
  endpoint,
  iterations,
}: {
  endpoint: string
  iterations: readonly Iteration[]
}): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { t } = useAppTranslation(
    'components/student/CompleteExerciseButton.tsx'
  )

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return (
    <React.Fragment>
      <button
        onClick={() => setIsModalOpen(!isModalOpen)}
        className="btn-enhanced btn-m"
      >
        <GraphicalIcon icon="check-circle" />
        <span>{t('markAsComplete')}</span>
      </button>
      <CompleteExerciseModal
        endpoint={endpoint}
        iterations={iterations}
        open={isModalOpen}
        onClose={handleModalClose}
      />
    </React.Fragment>
  )
}