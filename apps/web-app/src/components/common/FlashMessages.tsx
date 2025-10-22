'use client'

import React from 'react'
import { useFlashMessages } from '@/lib/auth/client'

/**
 * Flash Messages Component
 * Migrated from Ruby helpers/flash_helper.rb
 */

export type FlashMessageType = 'success' | 'error' | 'notice' | 'alert'

export interface FlashMessage {
  type: FlashMessageType
  message: string
  id?: string
}

export interface FlashMessagesProps {
  messages?: FlashMessage[]
  object?: {
    errors?: {
      full_messages?: string[]
    }
  }
  htmlMessages?: boolean
  className?: string
}

/**
 * Flash Messages component equivalent to Ruby's flash_messages helper
 */
export function FlashMessages({ 
  messages = [], 
  object, 
  htmlMessages = false,
  className = ''
}: FlashMessagesProps) {
  const { flashMessages: authFlashMessages } = useFlashMessages()
  
  // Combine prop messages with auth flash messages
  const allMessages = [...messages, ...authFlashMessages]
  
  // Add object errors if present
  const objectErrors: FlashMessage[] = []
  if (object?.errors?.full_messages) {
    objectErrors.push({
      type: 'error',
      message: object.errors.full_messages.join('<br/>'),
      id: 'object-errors'
    })
  }
  
  const finalMessages = [...allMessages, ...objectErrors]
  
  if (finalMessages.length === 0) {
    return null
  }

  return (
    <div className={`c-flash ${className}`}>
      {finalMessages.map((flashMessage, index) => (
        <FlashMessageItem
          key={('id' in flashMessage && flashMessage.id) || `flash-${index}`}
          message={flashMessage}
          htmlMessages={htmlMessages}
        />
      ))}
    </div>
  )
}

interface FlashMessageItemProps {
  message: FlashMessage
  htmlMessages: boolean
}

function FlashMessageItem({ message, htmlMessages }: FlashMessageItemProps) {
  const getMessageClassName = (type: FlashMessageType): string => {
    switch (type) {
      case 'error':
        return '--errors'
      case 'notice':
        return '--notice'
      case 'alert':
        return '--alert'
      case 'success':
        return '--success'
      default:
        return '--notice'
    }
  }

  const className = getMessageClassName(message.type)

  if (htmlMessages) {
    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: message.message }}
      />
    )
  }

  return (
    <div className={className}>
      {message.message}
    </div>
  )
}

/**
 * Hook for managing flash messages
 */
export function useFlashMessageManager() {
  const [messages, setMessages] = React.useState<FlashMessage[]>([])

  const addMessage = React.useCallback((type: FlashMessageType, message: string) => {
    const newMessage: FlashMessage = {
      type,
      message,
      id: `flash-${Date.now()}-${Math.random()}`
    }
    setMessages(prev => [...prev, newMessage])
  }, [])

  const removeMessage = React.useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }, [])

  const clearMessages = React.useCallback(() => {
    setMessages([])
  }, [])

  const addSuccess = React.useCallback((message: string) => {
    addMessage('success', message)
  }, [addMessage])

  const addError = React.useCallback((message: string) => {
    addMessage('error', message)
  }, [addMessage])

  const addNotice = React.useCallback((message: string) => {
    addMessage('notice', message)
  }, [addMessage])

  const addAlert = React.useCallback((message: string) => {
    addMessage('alert', message)
  }, [addMessage])

  return {
    messages,
    addMessage,
    removeMessage,
    clearMessages,
    addSuccess,
    addError,
    addNotice,
    addAlert
  }
}

export default FlashMessages