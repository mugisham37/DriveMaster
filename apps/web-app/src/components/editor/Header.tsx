import React, { forwardRef } from 'react'
import { GraphicalIcon } from '../common/GraphicalIcon'
import { Icon } from '../common/Icon'
import { Settings } from './header/Settings'
import { More } from './header/More'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export const Header = ({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element => <div className="header">{children}</div>

Header.Back = function HeaderBack({ exercisePath }: { exercisePath: string }) {
  const { t } = useAppTranslation('components/editor/header')
  return (
    <a href={exercisePath} className="close-btn">
      <GraphicalIcon icon="arrow-left" />
      {t('backToExercise')}
    </a>
  )
}

Header.Title = function HeaderTitle({
  trackTitle,
  exerciseTitle,
}: {
  trackTitle: string
  exerciseTitle: string
}) {
  return (
    <div className="title">
      <div className="track">{trackTitle}</div>
      <div className="divider">/</div>
      <div className="exercise">{exerciseTitle}</div>
    </div>
  )
}

Header.ActionKeyboardShortcuts = forwardRef<
  HTMLButtonElement,
  { onClick: () => void }
>(function HeaderActionKeyboardShortcuts({ onClick }, ref) {
  return (
    <button
      ref={ref}
      onClick={() => {
        onClick()
      }}
      className="keyboard-shortcuts-btn"
    >
      <Icon icon="keyboard" alt="Keyboard Shortcuts" />
    </button>
  )
})

Header.ActionSettings = Settings
Header.ActionMore = More