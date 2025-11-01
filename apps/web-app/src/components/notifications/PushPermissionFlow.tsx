/**
 * Push Permission Flow Component
 * 
 * Provides user-friendly browser permission requests with clear benefits explanation,
 * permission status tracking, re-prompt logic, and fallback messaging.
 * 
 * Requirements: 2.1, 2.2
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useNotificationPermission, useDeviceTokenRegistration } from '@/hooks'
import { Icon } from '@/components/common/Icon'
import { FormButton } from '@/components/common/forms/FormButton'
import { Modal } from '@/components/common/Modal'

// ============================================================================
// Types
// ============================================================================

export interface PushPermissionFlowProps {
  isOpen?: boolean
  onClose?: () => void
  onPermissionGranted?: () => void
  onPermissionDenied?: () => void
  showBenefits?: boolean
  autoRegisterOnGrant?: boolean
  className?: string
  trigger?: 'manual' | 'auto' | 'onboarding'
}

interface PermissionStep {
  id: string
  title: string
  description: string
  icon: string
  action?: string
}

// ============================================================================
// Constants
// ============================================================================

const PERMISSION_BENEFITS = [
  {
    icon: 'bell',
    title: 'Instant Notifications',
    description: 'Get notified immediately when important updates happen, even when the app is closed.'
  },
  {
    icon: 'trophy',
    title: 'Achievement Alerts',
    description: 'Never miss celebrating your learning milestones and achievements.'
  },
  {
    icon: 'clock',
    title: 'Study Reminders',
    description: 'Stay on track with personalized reminders for spaced repetition and practice sessions.'
  },
  {
    icon: 'chart-bar',
    title: 'Progress Updates',
    description: 'Get updates on your learning progress and streak maintenance.'
  }
]

const PERMISSION_STEPS: PermissionStep[] = [
  {
    id: 'intro',
    title: 'Enable Push Notifications',
    description: 'Stay connected with your learning journey through timely notifications.',
    icon: 'bell',
    action: 'request'
  },
  {
    id: 'browser-prompt',
    title: 'Browser Permission',
    description: 'Your browser will ask for permission to send notifications.',
    icon: 'computer-desktop'
  },
  {
    id: 'registration',
    title: 'Setting Up',
    description: 'We\'re configuring notifications for your device.',
    icon: 'cog'
  },
  {
    id: 'success',
    title: 'All Set!',
    description: 'You\'ll now receive push notifications for important updates.',
    icon: 'check-circle'
  }
]

// ============================================================================
// Main Component
// ============================================================================

export function PushPermissionFlow({
  isOpen = false,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
  showBenefits = true,
  autoRegisterOnGrant = true,
  className = '',
  trigger = 'manual'
}: PushPermissionFlowProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState<string>('intro')
  const [isVisible, setIsVisible] = useState(isOpen)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [dismissedPermanently, setDismissedPermanently] = useState(false)

  const { 
    permission, 
    requestPermission, 
    isSupported, 
    canRequest 
  } = useNotificationPermission()

  const {
    isRegistered,
    isRegistering,
    registrationError,
    register
  } = useDeviceTokenRegistration({
    autoRegister: false // We'll handle registration manually
  })

  // ============================================================================
  // Effects
  // ============================================================================

  // Check if user has previously dismissed permanently
  useEffect(() => {
    const dismissed = localStorage.getItem('push-permission-dismissed')
    if (dismissed === 'permanent') {
      setDismissedPermanently(true)
    }
  }, [])

  // Update visibility based on props and permission state
  useEffect(() => {
    if (dismissedPermanently) {
      setIsVisible(false)
      return
    }

    if (permission === 'granted' && isRegistered) {
      setIsVisible(false)
      return
    }

    if (permission === 'denied' && hasUserInteracted) {
      setCurrentStep('denied')
      return
    }

    setIsVisible(isOpen)
  }, [isOpen, permission, isRegistered, dismissedPermanently, hasUserInteracted])

  // Handle permission changes
  useEffect(() => {
    if (permission === 'granted' && hasUserInteracted) {
      setCurrentStep('registration')
      
      if (autoRegisterOnGrant) {
        handleDeviceRegistration()
      }
      
      onPermissionGranted?.()
    } else if (permission === 'denied' && hasUserInteracted) {
      setCurrentStep('denied')
      onPermissionDenied?.()
    }
  }, [permission, hasUserInteracted, autoRegisterOnGrant, onPermissionGranted, onPermissionDenied, handleDeviceRegistration])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleRequestPermission = useCallback(async () => {
    if (!isSupported) {
      setCurrentStep('unsupported')
      return
    }

    setHasUserInteracted(true)
    setCurrentStep('browser-prompt')

    try {
      const result = await requestPermission()
      
      if (result === 'granted') {
        setCurrentStep('registration')
      } else if (result === 'denied') {
        setCurrentStep('denied')
      }
    } catch (error) {
      console.error('Permission request failed:', error)
      setCurrentStep('error')
    }
  }, [isSupported, requestPermission])

  const handleDeviceRegistration = useCallback(async () => {
    if (permission !== 'granted') return

    try {
      await register()
      setCurrentStep('success')
      
      // Auto-close after success
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      console.error('Device registration failed:', error)
      setCurrentStep('registration-error')
    }
  }, [handleClose, permission, register])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    onClose?.()
  }, [onClose])

  const handleDismiss = useCallback((permanent = false) => {
    if (permanent) {
      localStorage.setItem('push-permission-dismissed', 'permanent')
      setDismissedPermanently(true)
    } else {
      localStorage.setItem('push-permission-dismissed', 'temporary')
    }
    
    handleClose()
  }, [handleClose])

  const handleRetry = useCallback(() => {
    setCurrentStep('intro')
    setHasUserInteracted(false)
  }, [])

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderBenefits = () => {
    if (!showBenefits) return null

    return (
      <div className="benefits-section mb-6">
        <h4 className="text-sm font-semibold text-textColor4 mb-4">
          Why enable notifications?
        </h4>
        <div className="grid grid-cols-1 gap-3">
          {PERMISSION_BENEFITS.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-8">
              <Icon icon={benefit.icon} className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-sm font-medium text-blue-800">{benefit.title}</h5>
                <p className="text-xs text-blue-700 mt-1">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderIntroStep = () => (
    <div className="intro-step text-center">
      <div className="mb-6">
        <Icon icon="bell" className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-textColor2 mb-2">
          Stay Connected with Your Learning
        </h3>
        <p className="text-textColor6">
          Enable push notifications to get timely updates about your progress, 
          achievements, and important reminders.
        </p>
      </div>

      {renderBenefits()}

      <div className="flex flex-col gap-3">
        <FormButton
          onClick={handleRequestPermission}
          className="btn-primary btn-m w-full"
          disabled={!canRequest}
        >
          <Icon icon="bell" className="w-4 h-4 mr-2" />
          Enable Notifications
        </FormButton>
        
        <div className="flex gap-2">
          <FormButton
            onClick={() => handleDismiss(false)}
            className="btn-ghost btn-s flex-1"
          >
            Maybe Later
          </FormButton>
          <FormButton
            onClick={() => handleDismiss(true)}
            className="btn-ghost btn-s flex-1 text-textColor6"
          >
            Don't Ask Again
          </FormButton>
        </div>
      </div>
    </div>
  )

  const renderBrowserPromptStep = () => (
    <div className="browser-prompt-step text-center">
      <Icon icon="computer-desktop" className="w-16 h-16 text-blue-600 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-textColor2 mb-2">
        Browser Permission Required
      </h3>
      <p className="text-textColor6 mb-6">
        Your browser should show a permission dialog. Please click &quot;Allow&quot; to enable notifications.
      </p>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-8 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Icon icon="exclamation-triangle" className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-yellow-800">
              Don&apos;t see the permission dialog?
            </h4>
            <p className="text-xs text-yellow-700 mt-1">
              Check if your browser blocked the popup or if notifications are disabled in your browser settings.
            </p>
          </div>
        </div>
      </div>

      <FormButton
        onClick={handleClose}
        className="btn-secondary btn-s"
      >
        Cancel
      </FormButton>
    </div>
  )

  const renderRegistrationStep = () => (
    <div className="registration-step text-center">
      <Icon icon="cog" className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
      <h3 className="text-xl font-semibold text-textColor2 mb-2">
        Setting Up Notifications
      </h3>
      <p className="text-textColor6 mb-6">
        We&apos;re configuring push notifications for your device. This will only take a moment.
      </p>
      
      {registrationError && (
        <div className="bg-red-50 border border-red-200 rounded-8 p-4 mb-4">
          <div className="flex items-start gap-3">
            <Icon icon="exclamation-circle" className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-left">
              <h4 className="text-sm font-medium text-red-800">Setup Failed</h4>
              <p className="text-xs text-red-700 mt-1">
                {registrationError.message || 'Failed to set up notifications. Please try again.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!autoRegisterOnGrant && !isRegistering && (
        <FormButton
          onClick={handleDeviceRegistration}
          className="btn-primary btn-m"
          disabled={isRegistering}
        >
          Complete Setup
        </FormButton>
      )}
    </div>
  )

  const renderSuccessStep = () => (
    <div className="success-step text-center">
      <Icon icon="check-circle" className="w-16 h-16 text-green-600 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-textColor2 mb-2">
        Notifications Enabled!
      </h3>
      <p className="text-textColor6 mb-6">
        You&apos;re all set! You&apos;ll now receive push notifications for important updates and reminders.
      </p>
      
      <div className="bg-green-50 border border-green-200 rounded-8 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Icon icon="information-circle" className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-green-800">
              Manage Your Preferences
            </h4>
            <p className="text-xs text-green-700 mt-1">
              You can customize which notifications you receive in your settings at any time.
            </p>
          </div>
        </div>
      </div>

      <FormButton
        onClick={handleClose}
        className="btn-primary btn-m"
      >
        Got It
      </FormButton>
    </div>
  )

  const renderDeniedStep = () => (
    <div className="denied-step text-center">
      <Icon icon="x-circle" className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-textColor2 mb-2">
        Notifications Blocked
      </h3>
      <p className="text-textColor6 mb-6">
        Push notifications have been disabled. You can still use the app, but you&apos;ll miss out on 
        important updates and reminders.
      </p>
      
      <div className="bg-blue-50 border border-blue-200 rounded-8 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Icon icon="information-circle" className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-blue-800">
              Want to enable notifications later?
            </h4>
            <p className="text-xs text-blue-700 mt-1">
              You can enable them in your browser settings or by clicking the notification icon in the address bar.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <FormButton
          onClick={handleRetry}
          className="btn-primary btn-s flex-1"
        >
          Try Again
        </FormButton>
        <FormButton
          onClick={handleClose}
          className="btn-secondary btn-s flex-1"
        >
          Continue Without
        </FormButton>
      </div>
    </div>
  )

  const renderUnsupportedStep = () => (
    <div className="unsupported-step text-center">
      <Icon icon="exclamation-triangle" className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-textColor2 mb-2">
        Notifications Not Supported
      </h3>
      <p className="text-textColor6 mb-6">
        Your browser doesn&apos;t support push notifications. You can still use the app normally, 
        but you won&apos;t receive push notifications.
      </p>
      
      <div className="bg-gray-50 border border-gray-200 rounded-8 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Icon icon="information-circle" className="w-5 h-5 text-gray-600 mt-0.5" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-gray-800">
              Alternative Options
            </h4>
            <p className="text-xs text-gray-700 mt-1">
              You'll still receive in-app notifications and can check for updates manually.
            </p>
          </div>
        </div>
      </div>

      <FormButton
        onClick={handleClose}
        className="btn-primary btn-m"
      >
        Continue
      </FormButton>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'intro':
        return renderIntroStep()
      case 'browser-prompt':
        return renderBrowserPromptStep()
      case 'registration':
        return renderRegistrationStep()
      case 'success':
        return renderSuccessStep()
      case 'denied':
        return renderDeniedStep()
      case 'unsupported':
        return renderUnsupportedStep()
      default:
        return renderIntroStep()
    }
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  if (!isVisible || dismissedPermanently) {
    return <></>
  }

  return (
    <Modal
      isOpen={isVisible}
      onClose={handleClose}
      title="Push Notifications"
      className={`push-permission-flow ${className}`}
      size="md"
      closeOnOverlayClick={currentStep === 'intro' || currentStep === 'denied'}
    >
      <div className="push-permission-content p-6">
        {renderCurrentStep()}
      </div>
    </Modal>
  )
}

export default PushPermissionFlow