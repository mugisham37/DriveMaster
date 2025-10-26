import React from 'react'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export function MostPopularTag(): React.JSX.Element {
  const { t } = useAppTranslation('automation-batch')
  return (
    <div className="flex items-center justify-center font-medium text-xs leading-[18px] py-2 px-8 border-1 border-orange rounded-md bg-bgCAlert ml-8 text-textCAlertLabel whitespace-nowrap">
      {t('components.mentoring.automation.mostPopularTag.mostPopular')}
    </div>
  )
}
