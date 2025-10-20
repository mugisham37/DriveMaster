// i18n-key-prefix:
// i18n-namespace: components/student/RequestMentoringButton.tsx
import React, { useState } from 'react'
import { RequestMentoringModal } from '../modals/RequestMentoringModal'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export type Links = {
  mentorRequest: string
}

export default function RequestMentoringButton({
  links,
}: {
  links: Links
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const { t } = useAppTranslation(
    'components/student/RequestMentoringButton.tsx'
  )

  return (
    <React.Fragment>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="available-slot"
      >
        <h4>{t('mentoringSlotAvailable')}</h4>
        <div className="btn-simple">{t('selectAnExercise')}</div>
      </button>
      <RequestMentoringModal
        isOpen={open}
        onClose={() => setOpen(false)}
        endpoint={links.mentorRequest}
      />
    </React.Fragment>
  )
}