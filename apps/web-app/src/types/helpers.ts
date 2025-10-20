/**
 * Type definitions for migrated Ruby helpers
 */

// Flash Messages Types
export type FlashMessageType = 'success' | 'error' | 'notice' | 'alert'

export interface FlashMessage {
  type: FlashMessageType
  message: string
  id?: string
}

// Email Button Types
export interface EmailButtonOptions {
  text: string
  href: string
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  fontSize?: string
  padding?: string
  borderRadius?: string
}

// User Track Completion Types
export type CompletionPercentageRange = 
  | 'range_0_10'
  | 'range_10_20' 
  | 'range_20_30'
  | 'range_30_40'
  | 'range_40_50'
  | 'range_50_60'
  | 'range_60_70'
  | 'range_70_80'
  | 'range_80_90'
  | 'range_90_100'
  | 'invalid_percentage'

export interface CompletionTextResult {
  range: CompletionPercentageRange
  message: string
  isValid: boolean
}

// External Link Types
export interface ExternalLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  showIcon?: boolean
  iconClassName?: string
  target?: string
  rel?: string
  [key: string]: unknown
}

// Helper function types
export type FlashMessageSetter = (type: FlashMessageType, message: string) => void
export type CompletionTextGetter = (percentage: number) => CompletionPercentageRange
export type EmailButtonGenerator = (text: string, href: string, options?: Partial<EmailButtonOptions>) => string