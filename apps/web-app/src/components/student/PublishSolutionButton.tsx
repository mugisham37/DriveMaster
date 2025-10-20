// i18n-key-prefix: publishSolutionButton
// i18n-namespace: components/student/PublishSolutionButton.tsx
import React, { useState } from 'react'
import { PublishSolutionModal } from '../modals/PublishSolutionModal'
import { Iteration } from '../../types'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export default function PublishSolutionButton({
  endpoint,
  iterations,
}: {
  endpoint: string
  iterations: readonly Iteration[]
}): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { t } = useAppTranslation(
    'components/student/PublishSolutionButton.tsx'
  )

  return (
    <>
      <button
        onClick={() => setIsModalOpen(!isModalOpen)}
        className="btn-enhanced btn-m publish-btn"
      >
        {t('publishSolutionButton.publishSolution')}
      </button>
      <PublishSolutionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        endpoint={endpoint}
        iterations={iterations}
      />
    </>
  )
}