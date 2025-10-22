// i18n-key-prefix: publishedSolutionLink
// i18n-namespace: components/track/activity-ticker
import React from 'react'
// import { useAppTranslation } from '@/i18n/useAppTranslation'
import { Trans } from 'react-i18next'

export function PublishedSolutionLink({
  publishedSolutionUrl,
}: {
  publishedSolutionUrl: string
}) {
  return (
    <span className="inline-flex">
      <Trans
        ns="components/track/activity-ticker"
        i18nKey="publishedSolutionLink.newSolution"
        components={[
          <a
            key="solution-link"
            href={publishedSolutionUrl}
            className="flex flex-row items-center font-semibold text-prominentLinkColor"
          />,
        ]}
      />
    </span>
  )
}
