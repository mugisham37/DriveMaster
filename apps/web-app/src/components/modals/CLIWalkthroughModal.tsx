import React from 'react'
import { GraphicalIcon } from '@/components/common'
import { CLIWalkthrough } from '@/components/common'
import { Modal, ModalProps } from './Modal'

export const CLIWalkthroughModal = ({
  user,
  ...props
}: Omit<ModalProps, 'className'> & { user?: { apiToken?: string } | null | undefined }): React.JSX.Element => {
  return (
    <Modal {...props} className="m-cli-walkthrough" cover={true}>
      <GraphicalIcon
        icon="wizard-modal"
        category="graphics"
        className="wizard-icon"
      />
      <CLIWalkthrough user={user || null} />
    </Modal>
  )
}
