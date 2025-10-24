import React from 'react'
import { Tab, GraphicalIcon } from '@/components/common'
import { TabsContext } from '@/components/editor'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export const FeedbackTab = (): React.JSX.Element => {
  const { t } = useAppTranslation('components/editor/tabs')
  return (
    <Tab id="feedback" context={TabsContext}>
      <GraphicalIcon icon="conversation-chat" />
      <span data-text="Feedback">{t('feedbackTab.feedback')}</span>
    </Tab>
  )
}
