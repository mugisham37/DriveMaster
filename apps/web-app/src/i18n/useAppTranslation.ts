'use client'

import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { initI18n } from './i18n'

export function useAppTranslation(namespace?: string) {
  // Initialize i18n on client side only
  useEffect(() => {
    initI18n()
  }, [])
  
  return useTranslation(namespace)
}
