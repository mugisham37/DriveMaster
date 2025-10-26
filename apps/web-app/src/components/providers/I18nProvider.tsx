'use client'

import { ReactNode, useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import { initI18n } from '@/i18n/i18n'

interface I18nProviderProps {
  children: ReactNode
}

/**
 * I18n provider component that initializes i18next on the client side
 * This prevents server-side React context initialization issues
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const i18n = initI18n()

  useEffect(() => {
    // Ensure i18n is initialized on client side
    initI18n()
  }, [])

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  )
}