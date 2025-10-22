// i18n-key-prefix: publishSettings
// i18n-namespace: components/student/published-solution
import React, { useState } from 'react'
import { useDropdown } from '@/hooks/useDropdown'
import {
  ChangePublishedIterationModal,
  RedirectType,
} from '../../modals/ChangePublishedIterationModal'
import { UnpublishSolutionModal } from '../../modals/UnpublishSolutionModal'
import { Iteration } from '@/types'
import { Icon } from '../../common'
import { useAppTranslation } from '@/i18n/useAppTranslation'

type ModalId = 'changePublishedIteration' | 'unpublish'

type Links = {
  changeIteration: string
  unpublish: string
}

export const PublishSettings = ({
  redirectType,
  publishedIterationIdx,
  iterations,
  links,
}: {
  redirectType: RedirectType
  publishedIterationIdx: number | null
  iterations: readonly Iteration[]
  links: Links
}): React.ReactElement => {
  const [openedModal, setOpenedModal] = useState<ModalId | null>(null)
  const { t } = useAppTranslation('components/student/published-solution')
  const {
    isOpen,
    dropdownRef,
    toggle,
    close,
    handleKeyDown,
  } = useDropdown()

  return (
    <React.Fragment>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={toggle}
          onKeyDown={handleKeyDown}
          className="publish-settings-button btn-xs btn-enhanced"
        >
          <Icon icon="settings" alt={t('publishSettings.publishSettings')} />
        </button>
        {isOpen && (
          <div className="c-dropdown-generic-menu">
            <ul>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setOpenedModal('changePublishedIteration')
                    close()
                  }}
                >
                  {t('publishSettings.changePublishedIterations')}
                </button>
              </li>
              <li>
                <button 
                  type="button" 
                  onClick={() => {
                    setOpenedModal('unpublish')
                    close()
                  }}
                >
                  {t('publishSettings.unpublishSolution')}
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      <ChangePublishedIterationModal
        endpoint={links.changeIteration}
        redirectType={redirectType}
        iterations={iterations}
        defaultIterationIdx={publishedIterationIdx}
        open={openedModal === 'changePublishedIteration'}
        onClose={() => setOpenedModal(null)}
        className="m-change-published-iteration"
      >
        {/* Modal content will be handled internally */}
      </ChangePublishedIterationModal>
      <UnpublishSolutionModal
        endpoint={links.unpublish}
        open={openedModal === 'unpublish'}
        onClose={() => setOpenedModal(null)}
        className="m-unpublish-solution"
      >
        {/* Modal content will be handled internally */}
      </UnpublishSolutionModal>
    </React.Fragment>
  )
}
