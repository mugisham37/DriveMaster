'use client'

import React from 'react'
import { Icon } from './Icon'
import { assembleClassNames } from '@/utils/assemble-classnames'
import { useAppTranslation } from '@/i18n/useAppTranslation'
import { Flair as FlairType } from '@/components/types'

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
  flair: Flair | FlairType | string
  iconClassName?: string
  className?: string
}): React.JSX.Element | null {
  const { t } = useAppTranslation('components/common/HandleWithFlair.tsx')

  const flairName = typeof flair === 'string' ? flair : typeof flair === 'object' && flair?.name ? flair.name : flair
  const flairKey = flairName as Flair

  return (
    <span className={assembleClassNames('flex items-center', className)}>
      {handle}
      {Object.prototype.hasOwnProperty.call(FLAIRS, flairKey) && (
        <>
          &nbsp;
          <Icon
            className={`handle-with-flair-icon ${iconClassName || ''}`}
            icon={FLAIRS[flairKey]}
            alt={t('flair.alt', { title: t(`flair.${flairKey}`) })}
          />
        </>
      )}
    </span>
  )
}
