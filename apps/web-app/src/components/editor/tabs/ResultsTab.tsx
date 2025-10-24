import React from 'react'
import { Tab, GraphicalIcon } from '@/components/common'
import { TabsContext } from '@/components/editor'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export const ResultsTab = (): React.JSX.Element => {
  const { t } = useAppTranslation('components/editor/tabs')
  return (
    <Tab id="results" context={TabsContext}>
      <GraphicalIcon icon="test-results" />
      <span data-text="Results">{t('resultsTab.results')}</span>
    </Tab>
  )
}
