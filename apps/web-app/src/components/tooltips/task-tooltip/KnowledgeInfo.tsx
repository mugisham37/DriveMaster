import React from 'react'
import { KnowledgeTag } from '../../contributing/tasks-list/task/KnowledgeTag'
import { TaskKnowledge, TaskModule } from '../../types'
import { useAppTranslation } from '@/i18n/useAppTranslation'
import { Trans } from 'react-i18next'

export const KnowledgeInfo = ({
  knowledge,
  module,
}: {
  knowledge: TaskKnowledge
  module?: TaskModule
}): React.JSX.Element => {
  return (
    <section>
      <div className="icon">
        <KnowledgeTag knowledge={knowledge} />
      </div>
      <div className="details">
        <KnowledgeDetails knowledge={knowledge} {...(module && { module })} />
      </div>
    </section>
  )
}

const KnowledgeDetails = ({
  knowledge,
  module,
}: {
  knowledge: TaskKnowledge
  module?: TaskModule
}): React.JSX.Element => {
  const { t } = useAppTranslation('components/tooltips/task-tooltip')
  
  // Helper function to get module description
  const getModuleDescription = (module?: TaskModule): string => {
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
        return t('summary.exercism')
    }
  }

  const desc = getModuleDescription(module)
  const transComponents = { strong: <strong /> }
  const transNs = 'components/tooltips/task-tooltip'

  switch (knowledge) {
    case 'none':
      return (
        <>
          <h3>
            <Trans
              ns={transNs}
              i18nKey="knowledgeInfo.noExistingKnowledge"
              components={transComponents}
            />
          </h3>
          <p>{t('knowledgeInfo.perfectForFirstContribution')}</p>
        </>
      )
    case 'elementary':
      return (
        <>
          <h3>
            <Trans
              ns={transNs}
              i18nKey="knowledgeInfo.elementaryKnowledge"
              components={transComponents}
            />
          </h3>
          <p>{t('knowledgeInfo.littleBitAboutExercism')}</p>
        </>
      )
    case 'intermediate':
      return (
        <>
          <h3>
            <Trans
              ns={transNs}
              i18nKey="knowledgeInfo.intermediateKnowledge"
              components={transComponents}
            />
          </h3>
          <p>
            {t('knowledgeInfo.keyPrinciplesOfArea', {
              desc: desc,
            })}
          </p>
        </>
      )
    case 'advanced':
      return (
        <>
          <h3>
            <Trans
              ns={transNs}
              i18nKey="knowledgeInfo.advancedKnowledge"
              components={transComponents}
            />
          </h3>
          <p>
            {t('knowledgeInfo.solidUnderstandingOfArea', {
              desc: desc,
            })}
          </p>
        </>
      )
    default:
      return <div>Unknown knowledge level</div>
  }
}
