// i18n-key-prefix: userAvatar
// i18n-namespace: components/track/activity-ticker
import React from 'react'
import Image from 'next/image'
import type { MetricUser } from '@/components/types'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export function UserAvatar({
  user,
}: {
  user?: MetricUser
}): React.JSX.Element | null {
  const { t } = useAppTranslation('components/track/activity-ticker')
  if (!user)
    return (
      <div className="w-[36px] h-[36px] mr-12 mt-6">
        <GraphicalIcon
          icon="avatar-placeholder"
          className="c-avatar"
          width={36}
          height={36}
        />
      </div>
    )
  return (
    <div className="w-[36px] h-[36px] mr-12 mt-6">
      <Image
        src={user.avatarUrl}
        alt={t('userAvatar.userAvatar', { handle: user.handle })}
        width={36}
        height={36}
        className="rounded-circle"
      />
    </div>
  )
}
