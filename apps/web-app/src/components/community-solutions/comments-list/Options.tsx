import React, { useState } from 'react'
import { useAppTranslation } from '@/i18n/useAppTranslation'
import { useDropdown } from '@/hooks/useAdvancedDropdown'
import { EnableSolutionCommentsModal } from '@/components/modals/EnableSolutionCommentsModal'
import { DisableSolutionCommentsModal } from '@/components/modals/DisableSolutionCommentsModal'
import { GraphicalIcon } from '@/components/common'

type Links = {
  enable: string
  disable: string
}

type ModalId = 'enableComments' | 'disableComments'

export const Options = ({
  allowComments,
  links,
  onCommentsEnabled,
  onCommentsDisabled,
}: {
  allowComments: boolean
  links: Links
  onCommentsEnabled: () => void
  onCommentsDisabled: () => void
}): React.JSX.Element => {
  const { t } = useAppTranslation('components/community-solutions')
  const [openedModal, setOpenedModal] = useState<ModalId | null>(null)
  const {
    buttonAttributes,
    panelAttributes,
    listAttributes,
    itemAttributes,
    open,
  } = useDropdown(1)

  return (
    <React.Fragment>
      <button
        {...buttonAttributes}
        className="btn-s text-14 text-textColor6 ml-auto"
      >
        <GraphicalIcon icon="settings" className="filter-textColor6" />
        <span>Options</span>
      </button>
      {open && (
        <div {...panelAttributes} className="c-dropdown-generic-menu">
          <ul {...listAttributes}>
            <li {...itemAttributes(1)}>
              {allowComments ? (
                <button
                  type="button"
                  onClick={() => setOpenedModal('disableComments')}
                >
                  {t('commentsList.options.disableComments')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenedModal('enableComments')}
                >
                  {t('commentsList.options.enableComments')}
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
      <EnableSolutionCommentsModal
        endpoint={links.enable}
        open={openedModal === 'enableComments'}
        onClose={() => setOpenedModal(null)}
        onSuccess={onCommentsEnabled}
      />
      <DisableSolutionCommentsModal
        endpoint={links.disable}
        open={openedModal === 'disableComments'}
        onClose={() => setOpenedModal(null)}
        onSuccess={onCommentsDisabled}
      />
    </React.Fragment>
  )
}
