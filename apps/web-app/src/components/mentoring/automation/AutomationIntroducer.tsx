import React from 'react'
import Introducer from '@/components/common/Introducer'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export function AutomationIntroducer({
  hideEndpoint,
}: {
  hideEndpoint: string
}): React.JSX.Element {
  const { t } = useAppTranslation('automation-batch')

  return (
    <Introducer
      slug={hideEndpoint}
      className="mb-24"
      icon="automation"
    >
      <h2>
        {t(
          'components.mentoring.automation.automationIntroducer.initiateFeedbackAutomationBeepBoopBop'
        )}
      </h2>
      <p>
        {t(
          'components.mentoring.automation.automationIntroducer.automationIsASpace'
        )}
      </p>
    </Introducer>
  )
}
