import React from 'react'
import { GraphicalIcon } from '../../../common'
import { useAppTranslation } from '@/i18n/useAppTranslation'
import Image from 'next/image'

type Links = {
  exercise: string
}

export const CelebrationStep = ({
  mentorHandle,
  links,
}: {
  mentorHandle: string
  links: Links
}): React.ReactElement => {
  const { t } = useAppTranslation(
    'components/modals/student/finish-mentor-discussion-modal'
  )
  return (
    <section className="celebrate-step neon-cat">
      <Image src="https://i.gifer.com/17xo.gif" width={200} height={200} className="gif" alt="Celebration animation" />
      <h2>{t('celebrationStep.thankYouForTestimonial')}</h2>
      <p>
        <strong>{t('celebrationStep.helpedMakeDay', { mentorHandle })}</strong>
        {t('celebrationStep.shareExperience')}
      </p>
      <a href={links.exercise} className="btn-enhanced btn-l --disabled">
        <span>{t('celebrationStep.backToExercise')}</span>
        <GraphicalIcon icon="arrow-right" />
      </a>
    </section>
  )
}
