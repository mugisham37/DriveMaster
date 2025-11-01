/**
 * Notification Center Demo Component
 * 
 * Demo component to showcase the NotificationCenter functionality
 */

'use client'

import React, { useState } from 'react'
import { NotificationCenter } from './NotificationCenter'
import { FormButton } from '@/components/common/forms/FormButton'
import { Icon } from '@/components/common/Icon'

export function NotificationCenterDemo(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="notification-center-demo">
      <FormButton
        onClick={() => setIsOpen(true)}
        className="btn-primary btn-m"
      >
        <Icon icon="bell" className="w-4 h-4 mr-2" />
        Open Notification Center
      </FormButton>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[80vh]">
            <NotificationCenter
              showHeader={true}
              showFilters={true}
              showSearch={true}
              showBulkActions={true}
              maxHeight={600}
              enableRealtime={true}
              onClose={() => setIsOpen(false)}
              onNotificationClick={(notification) => {
                console.log('Notification clicked:', notification)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationCenterDemo