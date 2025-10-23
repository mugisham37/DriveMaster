import React from 'react'
import { TabsContext } from '@/components/Editor'
import { Tab } from '@/components/common'

export type GetHelpPanelProps = {
  children?: React.ReactNode
}

export function ChatGptPanel({ children }: GetHelpPanelProps) {
  return (
    <Tab.Panel id="chat-gpt" context={TabsContext}>
      {children}
    </Tab.Panel>
  )
}
