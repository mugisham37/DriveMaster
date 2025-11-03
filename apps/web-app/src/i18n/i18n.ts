/**
 * Internationalization (i18n) Configuration
 * 
 * Provides multilingual support for the application with dynamic locale switching
 * and translation management.
 */

import { createInstance, type i18n as I18nInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

// Translation resources
const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        submit: 'Submit',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        refresh: 'Refresh'
      },
      
      // Navigation
      nav: {
        dashboard: 'Dashboard',
        lessons: 'Lessons',
        practice: 'Practice',
        tests: 'Mock Tests',
        progress: 'Progress',
        profile: 'Profile',
        settings: 'Settings',
        logout: 'Logout'
      },
      
      // Notifications
      notifications: {
        title: 'Notifications',
        markAllRead: 'Mark all as read',
        noNotifications: 'No notifications',
        achievement: 'Achievement Unlocked!',
        reminder: 'Reminder',
        update: 'Update',
        system: 'System Notification'
      },
      
      // Achievements
      achievements: {
        courseCompleted: 'Course Completed',
        streak: 'Streak Achievement',
        highScore: 'High Score',
        personalBest: 'Personal Best!',
        milestone: 'Milestone Reached'
      },
      
      // Errors
      errors: {
        generic: 'Something went wrong. Please try again.',
        network: 'Network error. Please check your connection.',
        authentication: 'Authentication required. Please log in.',
        notFound: 'Resource not found.',
        serverError: 'Server error. Please try again later.'
      }
    }
  },
  // Add more languages here as needed
  fr: {
    translation: {
      common: {
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succès',
        cancel: 'Annuler',
        confirm: 'Confirmer',
        save: 'Enregistrer',
        delete: 'Supprimer',
        edit: 'Modifier',
        close: 'Fermer',
        back: 'Retour',
        next: 'Suivant',
        submit: 'Soumettre',
        search: 'Rechercher',
        filter: 'Filtrer',
        sort: 'Trier',
        refresh: 'Actualiser'
      },
      nav: {
        dashboard: 'Tableau de bord',
        lessons: 'Leçons',
        practice: 'Pratique',
        tests: 'Tests simulés',
        progress: 'Progrès',
        profile: 'Profil',
        settings: 'Paramètres',
        logout: 'Déconnexion'
      },
      notifications: {
        title: 'Notifications',
        markAllRead: 'Tout marquer comme lu',
        noNotifications: 'Aucune notification',
        achievement: 'Succès débloqué!',
        reminder: 'Rappel',
        update: 'Mise à jour',
        system: 'Notification système'
      },
      achievements: {
        courseCompleted: 'Cours terminé',
        streak: 'Succès de série',
        highScore: 'Score élevé',
        personalBest: 'Record personnel!',
        milestone: 'Étape atteinte'
      },
      errors: {
        generic: 'Une erreur s\'est produite. Veuillez réessayer.',
        network: 'Erreur réseau. Vérifiez votre connexion.',
        authentication: 'Authentification requise. Veuillez vous connecter.',
        notFound: 'Ressource introuvable.',
        serverError: 'Erreur serveur. Veuillez réessayer plus tard.'
      }
    }
  }
}

let i18nInstance: I18nInstance | null = null

/**
 * Initialize i18n instance with configuration
 */
export async function initI18n(lng: string = 'en'): Promise<I18nInstance> {
  if (i18nInstance) {
    return i18nInstance
  }

  i18nInstance = createInstance({
    resources,
    lng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  })

  await i18nInstance.use(initReactI18next).init()

  return i18nInstance
}

/**
 * Get the current i18n instance
 */
export function getI18n(): I18nInstance {
  if (!i18nInstance) {
    throw new Error('i18n not initialized. Call initI18n() first.')
  }
  return i18nInstance
}

/**
 * Change the current language
 */
export async function changeLanguage(lng: string): Promise<void> {
  const instance = getI18n()
  await instance.changeLanguage(lng)
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): string[] {
  return Object.keys(resources)
}

/**
 * Get current language
 */
export function getCurrentLanguage(): string {
  const instance = getI18n()
  return instance.language
}

const i18nExports = {
  initI18n,
  getI18n,
  changeLanguage,
  getAvailableLanguages,
  getCurrentLanguage
}

export default i18nExports
