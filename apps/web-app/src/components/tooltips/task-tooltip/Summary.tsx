import React from 'react'
import { Task, TaskAction, TaskModule } from '../../types'
import { useAppTranslation } from '@/i18n/useAppTranslation'
import { Trans } from 'react-i18next'

export const Summary = ({ task }: { task: Task }): React.JSX.Element => {
  return (
    <section className="summary">
      <div className="icon">
        <SummaryTag />
      </div>
      <div className="details">
        <SummaryDetails task={task} />
      </div>
    </section>
  )
}

const SummaryTag = () => {
  const { t } = useAppTranslation('components/tooltips/task-tooltip')
  return <div className="task-icon">{t('summary.task')}</div>
}

// Helper functions moved to component context to avoid hook violations
const useVerbForAction = (action?: TaskAction) => {
  const { t } = useAppTranslation('components/tooltips/task-tooltip')

  switch (action) {
    case 'create':
      return t('summary.creating')
    case 'fix':
      return t('summary.fixing')
    case 'improve':
      return t('summary.improving')
    case 'proofread':
      return t('summary.proofreading')
    case 'sync':
      return t('summary.syncing')
    default:
      return null
  }
}

const useDescriptionForModule = (module?: TaskModule) => {
  const { t } = useAppTranslation('components/tooltips/task-tooltip')

  switch (module) {
    case 'analyzer':
      return t('summary.analyzers')
    case 'concept':
      return t('summary.concepts')
    case 'concept-exercise':
      return t('summary.learningExercises')
    case 'generator':
      return t('summary.generators')
    case 'practice-exercise':
      return t('summary.practiceExercises')
    case 'representer':
      return t('summary.representers')
    case 'test-runner':
      return t('summary.testRunners')
    default:
      return null
  }
}

export const SummaryDetails = ({ task }: { task: Task }) => {
  const moduleDescription = useDescriptionForModule(task.tags.module)
  const verb = useVerbForAction(task.tags.action)

  const moduleText = moduleDescription ? moduleDescription.replace(/s$/, '') : 'Exercism'

  return (
    <h3>
      <Trans
        i18nKey="summary.workingOn"
        ns="components/tooltips/task-tooltip"
        values={{
          verb: verb || 'working on',
          module: moduleText,
          type: task.tags.type || 'changes',
          trackSuffix: task.track ? ` for the ${task.track.title} Track` : '',
        }}
      />
    </h3>
  )
}
