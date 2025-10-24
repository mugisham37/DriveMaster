import React, { useState, useCallback } from 'react'
import { DeleteFileModal } from './legacy-file-banner/DeleteFileModal'
import { ProminentLink, GraphicalIcon } from '../common'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export const LegacyFileBanner = ({
  onDelete,
}: {
  onDelete: () => void
}): React.ReactElement => {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useAppTranslation('components/editor/LegacyFileBanner.tsx')

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <React.Fragment>
      <div className="legacy-file-banner">
        <h3 className="text-15 leading-150 font-semibold">
          {t('legacyFileBanner.fileUnexpected')}
        </h3>
        <button
          onClick={handleOpen}
          className="btn-xs btn-secondary mr-24 ml-auto"
        >
          <GraphicalIcon icon="trash" />
          <span>{t('legacyFileBanner.deleteFile')}</span>
        </button>
        {/* TODO: Power from Rails */}
        <ProminentLink
          link="/docs/using/solving-exercises/legacy-files"
          text={t('legacyFileBanner.learnMore')}
          external={true}
        />
      </div>
      <DeleteFileModal
        filename="legacy file"
        isOpen={isOpen}
        onCancel={handleClose}
        onDelete={onDelete}
      />
    </React.Fragment>
  )
}