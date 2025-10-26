import { useTranslation } from 'react-i18next';

export function useAppTranslation(namespace?: string) {
  const { t, i18n } = useTranslation(namespace);
  
  return {
    t,
    i18n,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
}