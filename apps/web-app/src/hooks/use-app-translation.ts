'use client'

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { initI18n } from '@/i18n/i18n';

export function useAppTranslation(namespace?: string) {
  // Initialize i18n on client side only
  useEffect(() => {
    initI18n();
  }, []);
  
  const { t, i18n } = useTranslation(namespace);
  
  return {
    t,
    i18n,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
}