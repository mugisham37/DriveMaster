import React from 'react'
import Link from 'next/link'
import { GraphicalIcon } from '../../common'
import { TrackProgressList } from '../types'
import { HeaderSummary } from './learning-section/HeaderSummary'
import { TracksEnrolledSummary } from './learning-section/TracksEnrolledSummary'
import { ExercisesCompletedSummary } from './learning-section/ExercisesCompletedSummary'
import { ConceptsLearntSummary } from './learning-section/ConceptsLearntSummary'
import { LearningOverview } from './learning-section/LearningOverview'
import { TrackSummary } from './learning-section/TrackSummary'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export type Props = {
  tracks: TrackProgressList
  links: Links
}

type Links = {
  solutions: string
  fable: string
}

export const LearningSection = ({ tracks }: Props): React.ReactElement => {
  const { t } = useAppTranslation('components/journey/overview')
  if (tracks.length === 0) {
    return (
      <section className="empty-section">
        <GraphicalIcon icon="exercises" />
        <h3 className="journey-h3 mb-24">
          {t('learningSection.youHaventJoinedTracks')}
        </h3>
        {/* TODO get link from rails */}
        <Link href="/tracks" className="btn-l btn-primary">
          {t('learningSection.chooseTrackToGetStarted')}
        </Link>
      </section>
    )
  }

  return (
    <section className="learning-section">
      <header className="section-header">
        <GraphicalIcon icon="exercises" />
        <h2 className="journey-h2">{t('learningSection.yourLearning')}</h2>
        <HeaderSummary tracks={tracks} />
      </header>
      <div className="summary-boxes">
        <TracksEnrolledSummary tracks={tracks} />
        <ExercisesCompletedSummary tracks={tracks} />
        <ConceptsLearntSummary tracks={tracks} />
      </div>
      <LearningOverview tracks={tracks} />
      <div className="tracks">
        {tracks.sort().items.map((track, idx) => (
          <TrackSummary
            key={track.slug}
            track={track}
            avgVelocity={null}
            expanded={idx == 0}
          />
        ))}
      </div>
      {/*<LearningStats tracks={tracks} links={links} />*/}
    </section>
  )
}