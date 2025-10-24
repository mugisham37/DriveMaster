import React from 'react'
import { Trans } from 'react-i18next'

export const Reminder = (): React.JSX.Element => {
  return (
    <p className="text-p-small text-text-textColor6 mt-16 mb-32">
      <Trans
        i18nKey="commentsList.reminder.rememberComments"
        ns="components/community-solutions"
        components={[<strong />]}
      />
    </p>
  )
}
