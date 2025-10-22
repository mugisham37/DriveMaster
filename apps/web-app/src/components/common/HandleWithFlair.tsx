import React from 'react'
import { Icon } from './Icon'
import { assembleClassNames } from '@/utils/assemble-classnames'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export type Flair = 'insider' | 'lifetime_insider' | 'founder' | 'staff'

type FlairIcons = 'insiders' | 'lifetime-insiders' | 'exercism-face-gradient'

type Flairs = Record<Flair, FlairIcons>

const FLAIRS: Flairs = {
  insider: 'insiders',
  lifetime_insider: 'lifetime-insiders',
  founder: 'exercism-face-gradient',
  staff: 'exercism-face-gradient',
}

export function HandleWithFlair({
  handle,
  flair,
  iconClassName,
  className,
}: {
  handle: string
  flair: Flair
  iconClassName?: string
  className?: string
}): React.JSX.Element | null {
  const { t } = useAppTranslation('components/common/HandleWithFlair.tsx')

  return (
    <span className={assembleClassNames('flex items-center', className)}>
      {handle}
      {Object.prototype.hasOwnProperty.call(FLAIRS, flair) && (
        <>
          &nbsp;
          <Icon
            className={`handle-with-flair-icon ${iconClassName || ''}`}
            icon={FLAIRS[flair]}
            alt={t('flair.alt', { title: t(`flair.${flair}`) })}
          />
        </>
      )}
    </span>
  )
}
