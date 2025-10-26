import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './en'

// Initialize i18n only on client side
export function initI18n() {
  if (typeof window !== 'undefined' && !i18n.isInitialized) {
    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: 'en',
        lng: 'en',
        debug: process.env.NODE_ENV === 'development',
        interpolation: {
          escapeValue: false,
        },
        resources: {
          en,
        },
      })
  }
  return i18n
}

export default i18n
