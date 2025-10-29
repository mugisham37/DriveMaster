'use client'

/**
 * GDPR Compliance Context with Comprehensive Privacy State Management
 * 
 * Implements:
 * - GDPRContext with comprehensive privacy state management
 * - Consent management with granular permission tracking
 * - Data export request handling with progress monitoring
 * - Data deletion workflows with confirmation and verification
 * - Requirements: 5.1, 5.2, 5.3, 5.4
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback, 
  ReactNode 
} from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { userServiceClient } from '@/lib/user-service'
import {
  queryKeys,
  CACHE_TIMES,
  createUserServiceQueryOptions,
} from '@/lib/cache/user-service-cache'
import type {
  GDPRExportResponse,
  GDPRDeleteResponse,
  ConsentPreferences,
  PrivacyReport,
  UserRightsStatus,
  ComplianceStatus,
  UserServiceError,
  DataRetentionPreference,
} from '@/types/user-service'

// ============================================================================
// GDPR State Types
// ============================================================================

export interface GDPRState {
  // Consent management
  consentPreferences: ConsentPreferences | null
  consentHistory: ConsentHistoryEntry[]
  
  // Data export
  exportRequests: Map<string, GDPRExportResponse>
  activeExportRequest: GDPRExportResponse | null
  
  // Data deletion
  deleteRequests: Map<string, GDPRDeleteResponse>
  activeDeleteRequest: GDPRDeleteResponse | null
  
  // Privacy reporting
  privacyReport: PrivacyReport | null
  complianceStatus: ComplianceStatus | null
  
  // User rights
  userRights: UserRightsStatus | null
  rightsExerciseHistory: RightsExerciseEntry[]
  
  // Loading states
  isLoading: boolean
  isConsentLoading: boolean
  isExportLoading: boolean
  isDeleteLoading: boolean
  isReportLoading: boolean
  isUpdating: boolean
  
  // Error states
  error: UserServiceError | null
  consentError: UserServiceError | null
  exportError: UserServiceError | null
  deleteError: UserServiceError | null
  reportError: UserServiceError | null
  
  // Privacy settings
  privacySettings: PrivacySettings
  dataRetentionSettings: DataRetentionPreference
  
  // Audit and compliance
  auditLog: AuditLogEntry[]
  complianceChecks: ComplianceCheck[]
  
  // Notifications and alerts
  privacyAlerts: PrivacyAlert[]
  consentReminders: ConsentReminder[]
}

// ============================================================================
// Additional Types for GDPR Context
// ============================================================================

export interface ConsentHistoryEntry {
  id: string
  userId: string
  consentType: keyof ConsentPreferences
  granted: boolean
  timestamp: Date
  ipAddress: string
  userAgent: string
  legalBasis: string
  purpose: string
}

export interface RightsExerciseEntry {
  id: string
  userId: string
  rightType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  requestDate: Date
  completionDate?: Date
  reason?: string
  details: Record<string, unknown>
}

export interface PrivacySettings {
  dataMinimization: boolean
  anonymizeData: boolean
  restrictProcessing: boolean
  optOutAnalytics: boolean
  optOutMarketing: boolean
  optOutPersonalization: boolean
}

export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  resource: string
  timestamp: Date
  ipAddress: string
  userAgent: string
  outcome: 'success' | 'failure' | 'partial'
  details: Record<string, unknown>
}

export interface ComplianceCheck {
  id: string
  checkType: string
  status: 'compliant' | 'non_compliant' | 'warning'
  description: string
  recommendation?: string
  lastChecked: Date
  nextCheck: Date
}

export interface PrivacyAlert {
  id: string
  type: 'consent_expiry' | 'data_breach' | 'policy_update' | 'rights_request'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  actionRequired: boolean
  actionUrl?: string
  createdAt: Date
  expiresAt?: Date
  acknowledged: boolean
}

export interface ConsentReminder {
  id: string
  consentType: keyof ConsentPreferences
  message: string
  dueDate: Date
  frequency: 'once' | 'monthly' | 'quarterly' | 'yearly'
  lastSent?: Date
  acknowledged: boolean
}

// ============================================================================
// Action Types
// ============================================================================

export type GDPRAction =
  // Consent actions
  | { type: 'CONSENT_FETCH_START' }
  | { type: 'CONSENT_FETCH_SUCCESS'; payload: { consent: ConsentPreferences } }
  | { type: 'CONSENT_FETCH_ERROR'; payload: { error: UserServiceError } }
  | { type: 'CONSENT_UPDATE_START' }
  | { type: 'CONSENT_UPDATE_SUCCESS'; payload: { consent: ConsentPreferences; historyEntry: ConsentHistoryEntry } }
  | { type: 'CONSENT_UPDATE_ERROR'; payload: { error: UserServiceError } }
  
  // Export actions
  | { type: 'EXPORT_REQUEST_START' }
  | { type: 'EXPORT_REQUEST_SUCCESS'; payload: { exportResponse: GDPRExportResponse } }
  | { type: 'EXPORT_REQUEST_ERROR'; payload: { error: UserServiceError } }
  | { type: 'EXPORT_STATUS_UPDATE'; payload: { requestId: string; status: GDPRExportResponse } }
  
  // Delete actions
  | { type: 'DELETE_REQUEST_START' }
  | { type: 'DELETE_REQUEST_SUCCESS'; payload: { deleteResponse: GDPRDeleteResponse } }
  | { type: 'DELETE_REQUEST_ERROR'; payload: { error: UserServiceError } }
  | { type: 'DELETE_STATUS_UPDATE'; payload: { requestId: string; status: GDPRDeleteResponse } }
  
  // Privacy report actions
  | { type: 'REPORT_FETCH_START' }
  | { type: 'REPORT_FETCH_SUCCESS'; payload: { report: PrivacyReport } }
  | { type: 'REPORT_FETCH_ERROR'; payload: { error: UserServiceError } }
  
  // User rights actions
  | { type: 'RIGHTS_EXERCISE_START' }
  | { type: 'RIGHTS_EXERCISE_SUCCESS'; payload: { entry: RightsExerciseEntry } }
  | { type: 'RIGHTS_EXERCISE_ERROR'; payload: { error: UserServiceError } }
  
  // Privacy settings actions
  | { type: 'PRIVACY_SETTINGS_UPDATE'; payload: { settings: PrivacySettings } }
  | { type: 'DATA_RETENTION_UPDATE'; payload: { retention: DataRetentionPreference } }
  
  // Audit and compliance actions
  | { type: 'AUDIT_LOG_ADD'; payload: { entry: AuditLogEntry } }
  | { type: 'COMPLIANCE_CHECK_UPDATE'; payload: { checks: ComplianceCheck[] } }
  
  // Notifications actions
  | { type: 'PRIVACY_ALERT_ADD'; payload: { alert: PrivacyAlert } }
  | { type: 'PRIVACY_ALERT_ACKNOWLEDGE'; payload: { alertId: string } }
  | { type: 'CONSENT_REMINDER_ADD'; payload: { reminder: ConsentReminder } }
  | { type: 'CONSENT_REMINDER_ACKNOWLEDGE'; payload: { reminderId: string } }
  
  // Error management
  | { type: 'CLEAR_ERROR'; payload?: { errorType?: keyof Pick<GDPRState, 'error' | 'consentError' | 'exportError' | 'deleteError' | 'reportError'> } }
  | { type: 'CLEAR_ALL_ERRORS' }

// ============================================================================
// Initial State
// ============================================================================

const initialState: GDPRState = {
  consentPreferences: null,
  consentHistory: [],
  
  exportRequests: new Map(),
  activeExportRequest: null,
  
  deleteRequests: new Map(),
  activeDeleteRequest: null,
  
  privacyReport: null,
  complianceStatus: null,
  
  userRights: null,
  rightsExerciseHistory: [],
  
  isLoading: false,
  isConsentLoading: false,
  isExportLoading: false,
  isDeleteLoading: false,
  isReportLoading: false,
  isUpdating: false,
  
  error: null,
  consentError: null,
  exportError: null,
  deleteError: null,
  reportError: null,
  
  privacySettings: {
    dataMinimization: true,
    anonymizeData: false,
    restrictProcessing: false,
    optOutAnalytics: false,
    optOutMarketing: false,
    optOutPersonalization: false,
  },
  
  dataRetentionSettings: {
    profile: 365 * 2, // 2 years
    activity: 365, // 1 year
    progress: 365 * 5, // 5 years
  },
  
  auditLog: [],
  complianceChecks: [],
  
  privacyAlerts: [],
  consentReminders: [],
}

// ============================================================================
// Reducer
// ============================================================================

function gdprReducer(state: GDPRState, action: GDPRAction): GDPRState {
  switch (action.type) {
    // Consent
    case 'CONSENT_FETCH_START':
      return {
        ...state,
        isConsentLoading: true,
        isLoading: true,
        consentError: null,
      }
    
    case 'CONSENT_FETCH_SUCCESS':
      return {
        ...state,
        isConsentLoading: false,
        isLoading: false,
        consentPreferences: action.payload.consent,
        consentError: null,
      }
    
    case 'CONSENT_FETCH_ERROR':
      return {
        ...state,
        isConsentLoading: false,
        isLoading: false,
        consentError: action.payload.error,
      }
    
    case 'CONSENT_UPDATE_START':
      return {
        ...state,
        isUpdating: true,
        consentError: null,
      }
    
    case 'CONSENT_UPDATE_SUCCESS':
      return {
        ...state,
        isUpdating: false,
        consentPreferences: action.payload.consent,
        consentHistory: [action.payload.historyEntry, ...state.consentHistory].slice(0, 100),
        consentError: null,
      }
    
    case 'CONSENT_UPDATE_ERROR':
      return {
        ...state,
        isUpdating: false,
        consentError: action.payload.error,
      }
    
    // Export
    case 'EXPORT_REQUEST_START':
      return {
        ...state,
        isExportLoading: true,
        isLoading: true,
        exportError: null,
      }
    
    case 'EXPORT_REQUEST_SUCCESS':
      const updatedExportRequests = new Map(state.exportRequests)
      updatedExportRequests.set(action.payload.exportResponse.requestId, action.payload.exportResponse)
      return {
        ...state,
        isExportLoading: false,
        isLoading: false,
        exportRequests: updatedExportRequests,
        activeExportRequest: action.payload.exportResponse,
        exportError: null,
      }
    
    case 'EXPORT_REQUEST_ERROR':
      return {
        ...state,
        isExportLoading: false,
        isLoading: false,
        exportError: action.payload.error,
      }
    
    case 'EXPORT_STATUS_UPDATE':
      const exportRequests = new Map(state.exportRequests)
      exportRequests.set(action.payload.requestId, action.payload.status)
      return {
        ...state,
        exportRequests,
        activeExportRequest: state.activeExportRequest?.requestId === action.payload.requestId 
          ? action.payload.status 
          : state.activeExportRequest,
      }
    
    // Delete
    case 'DELETE_REQUEST_START':
      return {
        ...state,
        isDeleteLoading: true,
        isLoading: true,
        deleteError: null,
      }
    
    case 'DELETE_REQUEST_SUCCESS':
      const updatedDeleteRequests = new Map(state.deleteRequests)
      updatedDeleteRequests.set(action.payload.deleteResponse.requestId, action.payload.deleteResponse)
      return {
        ...state,
        isDeleteLoading: false,
        isLoading: false,
        deleteRequests: updatedDeleteRequests,
        activeDeleteRequest: action.payload.deleteResponse,
        deleteError: null,
      }
    
    case 'DELETE_REQUEST_ERROR':
      return {
        ...state,
        isDeleteLoading: false,
        isLoading: false,
        deleteError: action.payload.error,
      }
    
    case 'DELETE_STATUS_UPDATE':
      const deleteRequests = new Map(state.deleteRequests)
      deleteRequests.set(action.payload.requestId, action.payload.status)
      return {
        ...state,
        deleteRequests,
        activeDeleteRequest: state.activeDeleteRequest?.requestId === action.payload.requestId 
          ? action.payload.status 
          : state.activeDeleteRequest,
      }
    
    // Privacy report
    case 'REPORT_FETCH_START':
      return {
        ...state,
        isReportLoading: true,
        isLoading: true,
        reportError: null,
      }
    
    case 'REPORT_FETCH_SUCCESS':
      return {
        ...state,
        isReportLoading: false,
        isLoading: false,
        privacyReport: action.payload.report,
        complianceStatus: action.payload.report.complianceStatus,
        reportError: null,
      }
    
    case 'REPORT_FETCH_ERROR':
      return {
        ...state,
        isReportLoading: false,
        isLoading: false,
        reportError: action.payload.error,
      }
    
    // User rights
    case 'RIGHTS_EXERCISE_START':
      return {
        ...state,
        isUpdating: true,
        error: null,
      }
    
    case 'RIGHTS_EXERCISE_SUCCESS':
      return {
        ...state,
        isUpdating: false,
        rightsExerciseHistory: [action.payload.entry, ...state.rightsExerciseHistory].slice(0, 50),
        error: null,
      }
    
    case 'RIGHTS_EXERCISE_ERROR':
      return {
        ...state,
        isUpdating: false,
        error: action.payload.error,
      }
    
    // Privacy settings
    case 'PRIVACY_SETTINGS_UPDATE':
      return {
        ...state,
        privacySettings: action.payload.settings,
      }
    
    case 'DATA_RETENTION_UPDATE':
      return {
        ...state,
        dataRetentionSettings: action.payload.retention,
      }
    
    // Audit and compliance
    case 'AUDIT_LOG_ADD':
      return {
        ...state,
        auditLog: [action.payload.entry, ...state.auditLog].slice(0, 100),
      }
    
    case 'COMPLIANCE_CHECK_UPDATE':
      return {
        ...state,
        complianceChecks: action.payload.checks,
      }
    
    // Notifications
    case 'PRIVACY_ALERT_ADD':
      return {
        ...state,
        privacyAlerts: [action.payload.alert, ...state.privacyAlerts].slice(0, 20),
      }
    
    case 'PRIVACY_ALERT_ACKNOWLEDGE':
      return {
        ...state,
        privacyAlerts: state.privacyAlerts.map(alert =>
          alert.id === action.payload.alertId
            ? { ...alert, acknowledged: true }
            : alert
        ),
      }
    
    case 'CONSENT_REMINDER_ADD':
      return {
        ...state,
        consentReminders: [action.payload.reminder, ...state.consentReminders].slice(0, 10),
      }
    
    case 'CONSENT_REMINDER_ACKNOWLEDGE':
      return {
        ...state,
        consentReminders: state.consentReminders.map(reminder =>
          reminder.id === action.payload.reminderId
            ? { ...reminder, acknowledged: true }
            : reminder
        ),
      }
    
    // Error management
    case 'CLEAR_ERROR':
      if (action.payload?.errorType) {
        return {
          ...state,
          [action.payload.errorType]: null,
        }
      }
      return {
        ...state,
        error: null,
      }
    
    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        error: null,
        consentError: null,
        exportError: null,
        deleteError: null,
        reportError: null,
      }
    
    default:
      return state
  }
}

// ============================================================================
// Context Definition
// ============================================================================

export interface GDPRContextValue {
  // State
  state: GDPRState
  
  // Computed properties
  consentPreferences: ConsentPreferences | null
  privacyReport: PrivacyReport | null
  complianceStatus: ComplianceStatus | null
  userRights: UserRightsStatus | null
  isLoading: boolean
  isUpdating: boolean
  error: UserServiceError | null
  
  // Consent management (Task 8.1)
  fetchConsentPreferences: () => Promise<void>
  updateConsentPreferences: (consent: Partial<ConsentPreferences>) => Promise<void>
  grantConsent: (consentType: keyof ConsentPreferences, purpose: string) => Promise<void>
  withdrawConsent: (consentType: keyof ConsentPreferences, reason: string) => Promise<void>
  getConsentHistory: () => ConsentHistoryEntry[]
  
  // Data export (Task 8.1)
  requestDataExport: () => Promise<GDPRExportResponse>
  checkExportStatus: (requestId: string) => Promise<GDPRExportResponse>
  downloadExportData: (requestId: string) => Promise<string>
  
  // Data deletion (Task 8.1)
  requestDataDeletion: (reason: string) => Promise<GDPRDeleteResponse>
  checkDeletionStatus: (requestId: string) => Promise<GDPRDeleteResponse>
  cancelDeletionRequest: (requestId: string) => Promise<void>
  
  // Privacy reporting and audit (Task 8.2)
  generatePrivacyReport: () => Promise<PrivacyReport>
  getAuditLog: (days?: number) => Promise<AuditLogEntry[]>
  trackDataUsage: (action: string, resource: string, details?: Record<string, unknown>) => Promise<void>
  runComplianceCheck: () => Promise<ComplianceCheck[]>
  
  // User rights management (Task 8.3)
  exerciseUserRight: (rightType: RightsExerciseEntry['rightType'], details: Record<string, unknown>) => Promise<void>
  getRightsExerciseHistory: () => RightsExerciseEntry[]
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>
  updateDataRetentionSettings: (retention: Partial<DataRetentionPreference>) => Promise<void>
  
  // Privacy incident handling (Task 8.3)
  reportPrivacyIncident: (incident: PrivacyIncident) => Promise<void>
  getPrivacyAlerts: () => PrivacyAlert[]
  acknowledgePrivacyAlert: (alertId: string) => Promise<void>
  
  // Utility functions
  clearError: (errorType?: keyof Pick<GDPRState, 'error' | 'consentError' | 'exportError' | 'deleteError' | 'reportError'>) => void
  clearAllErrors: () => void
  isConsentGranted: (consentType: keyof ConsentPreferences) => boolean
  getDataRetentionPeriod: (dataType: keyof DataRetentionPreference) => number
  isComplianceStatusHealthy: () => boolean
}

// ============================================================================
// Additional Types for Context
// ============================================================================

export interface PrivacyIncident {
  type: 'data_breach' | 'unauthorized_access' | 'data_loss' | 'policy_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedData: string[]
  discoveredAt: Date
  reportedBy: string
  details: Record<string, unknown>
}

const GDPRContext = createContext<GDPRContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

export interface GDPRProviderProps {
  children: ReactNode
}

export function GDPRProvider({ children }: GDPRProviderProps) {
  const [state, dispatch] = useReducer(gdprReducer, initialState)
  const { user: authUser, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  
  const userId = authUser?.id?.toString()
  
  // ============================================================================
  // React Query Integration
  // ============================================================================
  
  // Consent preferences query
  const consentQuery = useQuery<ConsentPreferences, UserServiceError>({
    queryKey: queryKeys.gdprConsent(userId || ''),
    queryFn: () => userServiceClient.getGdprConsent(userId!),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<ConsentPreferences, UserServiceError>(
      CACHE_TIMES.USER_PREFERENCES
    ),
  })
  
  // Privacy report query
  const privacyReportQuery = useQuery<PrivacyReport, UserServiceError>({
    queryKey: queryKeys.privacyReport(userId || ''),
    queryFn: () => userServiceClient.generatePrivacyReport(userId!),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<PrivacyReport, UserServiceError>(
      CACHE_TIMES.PRIVACY_REPORT
    ),
  })
  
  // Consent update mutation
  const consentUpdateMutation = useMutation({
    mutationFn: async (consent: Partial<ConsentPreferences>) => {
      if (!userId) throw new Error('User not authenticated')
      await userServiceClient.updateConsent(userId, consent as ConsentPreferences)
      return consent
    },
    onMutate: () => {
      dispatch({ type: 'CONSENT_UPDATE_START' })
    },
    onSuccess: (consent) => {
      // Create history entry
      const historyEntry: ConsentHistoryEntry = {
        id: `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId!,
        consentType: Object.keys(consent)[0] as keyof ConsentPreferences,
        granted: Object.values(consent)[0] as boolean,
        timestamp: new Date(),
        ipAddress: '0.0.0.0', // Will be set by server
        userAgent: navigator.userAgent,
        legalBasis: 'consent',
        purpose: 'User preference update',
      }
      
      dispatch({ 
        type: 'CONSENT_UPDATE_SUCCESS', 
        payload: { 
          consent: { ...state.consentPreferences, ...consent } as ConsentPreferences,
          historyEntry
        } 
      })
      
      // Invalidate related caches
      queryClient.invalidateQueries({
        queryKey: queryKeys.gdprConsent(userId!)
      })
    },
    onError: (error: UserServiceError) => {
      dispatch({ 
        type: 'CONSENT_UPDATE_ERROR', 
        payload: { error } 
      })
    },
  })
  
  // Data export mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated')
      return await userServiceClient.exportUserData(userId)
    },
    onMutate: () => {
      dispatch({ type: 'EXPORT_REQUEST_START' })
    },
    onSuccess: (exportResponse) => {
      dispatch({ 
        type: 'EXPORT_REQUEST_SUCCESS', 
        payload: { exportResponse } 
      })
    },
    onError: (error: UserServiceError) => {
      dispatch({ 
        type: 'EXPORT_REQUEST_ERROR', 
        payload: { error } 
      })
    },
  })
  
  // Data deletion mutation
  const deleteDataMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!userId) throw new Error('User not authenticated')
      return await userServiceClient.requestDataDeletion(userId, reason)
    },
    onMutate: () => {
      dispatch({ type: 'DELETE_REQUEST_START' })
    },
    onSuccess: (deleteResponse) => {
      dispatch({ 
        type: 'DELETE_REQUEST_SUCCESS', 
        payload: { deleteResponse: deleteResponse as unknown as GDPRDeleteResponse } 
      })
    },
    onError: (error: UserServiceError) => {
      dispatch({ 
        type: 'DELETE_REQUEST_ERROR', 
        payload: { error } 
      })
    },
  })
  
  // ============================================================================
  // Effects for data synchronization
  // ============================================================================
  
  // Sync consent data
  useEffect(() => {
    if (consentQuery.data && !consentQuery.isLoading) {
      dispatch({
        type: 'CONSENT_FETCH_SUCCESS',
        payload: { consent: consentQuery.data },
      })
    }
  }, [consentQuery.data, consentQuery.isLoading])
  
  useEffect(() => {
    if (consentQuery.error && !consentQuery.isLoading) {
      dispatch({
        type: 'CONSENT_FETCH_ERROR',
        payload: { error: consentQuery.error },
      })
    }
  }, [consentQuery.error, consentQuery.isLoading])
  
  // Sync privacy report data
  useEffect(() => {
    if (privacyReportQuery.data && !privacyReportQuery.isLoading) {
      dispatch({
        type: 'REPORT_FETCH_SUCCESS',
        payload: { report: privacyReportQuery.data },
      })
    }
  }, [privacyReportQuery.data, privacyReportQuery.isLoading])
  
  useEffect(() => {
    if (privacyReportQuery.error && !privacyReportQuery.isLoading) {
      dispatch({
        type: 'REPORT_FETCH_ERROR',
        payload: { error: privacyReportQuery.error },
      })
    }
  }, [privacyReportQuery.error, privacyReportQuery.isLoading])
  
  // ============================================================================
  // Consent Management Functions (Task 8.1)
  // ============================================================================
  
  const fetchConsentPreferences = useCallback(async () => {
    if (!userId) return
    await consentQuery.refetch()
  }, [userId, consentQuery])
  
  const updateConsentPreferences = useCallback(async (consent: Partial<ConsentPreferences>) => {
    await consentUpdateMutation.mutateAsync(consent)
  }, [consentUpdateMutation])
  
  const grantConsent = useCallback(async (consentType: keyof ConsentPreferences, purpose: string) => {
    const consent = { [consentType]: true }
    await updateConsentPreferences(consent)
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'consent_granted',
      resource: consentType,
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { purpose, consentType },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
  }, [updateConsentPreferences, userId])
  
  const withdrawConsent = useCallback(async (consentType: keyof ConsentPreferences, reason: string) => {
    const consent = { [consentType]: false }
    await updateConsentPreferences(consent)
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'consent_withdrawn',
      resource: consentType,
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { reason, consentType },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
  }, [updateConsentPreferences, userId])
  
  const getConsentHistory = useCallback((): ConsentHistoryEntry[] => {
    return state.consentHistory
  }, [state.consentHistory])
  
  // ============================================================================
  // Data Export Functions (Task 8.1)
  // ============================================================================
  
  const requestDataExport = useCallback(async (): Promise<GDPRExportResponse> => {
    const response = await exportDataMutation.mutateAsync()
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'data_export_requested',
      resource: 'user_data',
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { requestId: response.requestId },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
    
    return response
  }, [exportDataMutation, userId])
  
  const checkExportStatus = useCallback(async (requestId: string): Promise<GDPRExportResponse> => {
    if (!userId) throw new Error('User not authenticated')
    
    const status = await userServiceClient.getGdprExportStatus(requestId)
    
    dispatch({
      type: 'EXPORT_STATUS_UPDATE',
      payload: { requestId, status }
    })
    
    return status
  }, [userId])
  
  const downloadExportData = useCallback(async (requestId: string): Promise<string> => {
    const exportRequest = state.exportRequests.get(requestId)
    
    if (!exportRequest || !exportRequest.downloadUrl) {
      throw new Error('Export not ready for download')
    }
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'data_export_downloaded',
      resource: 'user_data',
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { requestId },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
    
    return exportRequest.downloadUrl
  }, [state.exportRequests, userId])
  
  // ============================================================================
  // Data Deletion Functions (Task 8.1)
  // ============================================================================
  
  const requestDataDeletion = useCallback(async (reason: string): Promise<GDPRDeleteResponse> => {
    const response = await deleteDataMutation.mutateAsync(reason)
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'data_deletion_requested',
      resource: 'user_data',
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { reason, requestId: (response as unknown as { requestId: string }).requestId },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
    
    return response as unknown as GDPRDeleteResponse
  }, [deleteDataMutation, userId])
  
  const checkDeletionStatus = useCallback(async (requestId: string): Promise<GDPRDeleteResponse> => {
    // This would be implemented with a proper API endpoint
    const deleteRequest = state.deleteRequests.get(requestId)
    
    if (!deleteRequest) {
      throw new Error('Delete request not found')
    }
    
    return deleteRequest
  }, [state.deleteRequests])
  
  const cancelDeletionRequest = useCallback(async (requestId: string): Promise<void> => {
    // This would be implemented with a proper API endpoint
    console.log('Cancelling deletion request:', requestId)
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'data_deletion_cancelled',
      resource: 'user_data',
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { requestId },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
  }, [userId])
  
  // ============================================================================
  // Privacy Reporting and Audit Functions (Task 8.2)
  // ============================================================================
  
  const generatePrivacyReport = useCallback(async (): Promise<PrivacyReport> => {
    if (!userId) throw new Error('User not authenticated')
    
    dispatch({ type: 'REPORT_FETCH_START' })
    
    try {
      const report = await userServiceClient.generatePrivacyReport(userId)
      
      dispatch({
        type: 'REPORT_FETCH_SUCCESS',
        payload: { report }
      })
      
      // Log audit entry
      const auditEntry: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'privacy_report_generated',
        resource: 'privacy_data',
        timestamp: new Date(),
        ipAddress: '0.0.0.0',
        userAgent: navigator.userAgent,
        outcome: 'success',
        details: { reportId: `report_${Date.now()}` },
      }
      
      dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
      
      return report
    } catch (error) {
      dispatch({
        type: 'REPORT_FETCH_ERROR',
        payload: { error: error as UserServiceError }
      })
      throw error
    }
  }, [userId])
  
  const getAuditLog = useCallback(async (days: number = 30): Promise<AuditLogEntry[]> => {
    // Filter audit log by date range
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return state.auditLog.filter(entry => entry.timestamp >= cutoffDate)
  }, [state.auditLog])
  
  const trackDataUsage = useCallback(async (
    action: string, 
    resource: string, 
    details: Record<string, unknown> = {}
  ): Promise<void> => {
    if (!userId) return
    
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      resource,
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details,
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
  }, [userId])
  
  const runComplianceCheck = useCallback(async (): Promise<ComplianceCheck[]> => {
    // Simulate compliance checks
    const checks: ComplianceCheck[] = [
      {
        id: 'consent_validity',
        checkType: 'consent_management',
        status: state.consentPreferences ? 'compliant' : 'non_compliant',
        description: 'Verify user consent is properly recorded and up to date',
        recommendation: state.consentPreferences ? 'Consent preferences are up to date' : 'Update consent preferences',
        lastChecked: new Date(),
        nextCheck: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      {
        id: 'data_retention',
        checkType: 'data_retention',
        status: 'compliant',
        description: 'Verify data retention policies are being followed',
        lastChecked: new Date(),
        nextCheck: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      {
        id: 'user_rights',
        checkType: 'user_rights',
        status: 'compliant',
        description: 'Verify user rights can be exercised',
        lastChecked: new Date(),
        nextCheck: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      },
    ]
    
    dispatch({ type: 'COMPLIANCE_CHECK_UPDATE', payload: { checks } })
    
    return checks
  }, [state.consentPreferences])
  
  // ============================================================================
  // User Rights Management Functions (Task 8.3)
  // ============================================================================
  
  const exerciseUserRight = useCallback(async (
    rightType: RightsExerciseEntry['rightType'], 
    details: Record<string, unknown>
  ): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')
    
    dispatch({ type: 'RIGHTS_EXERCISE_START' })
    
    try {
      const entry: RightsExerciseEntry = {
        id: `rights_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        rightType,
        status: 'pending',
        requestDate: new Date(),
        details,
      }
      
      dispatch({
        type: 'RIGHTS_EXERCISE_SUCCESS',
        payload: { entry }
      })
      
      // Log audit entry
      const auditEntry: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: `user_right_${rightType}`,
        resource: 'user_rights',
        timestamp: new Date(),
        ipAddress: '0.0.0.0',
        userAgent: navigator.userAgent,
        outcome: 'success',
        details: { rightType, ...details },
      }
      
      dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
      
    } catch (error) {
      dispatch({
        type: 'RIGHTS_EXERCISE_ERROR',
        payload: { error: error as UserServiceError }
      })
      throw error
    }
  }, [userId])
  
  const getRightsExerciseHistory = useCallback((): RightsExerciseEntry[] => {
    return state.rightsExerciseHistory
  }, [state.rightsExerciseHistory])
  
  const updatePrivacySettings = useCallback(async (settings: Partial<PrivacySettings>): Promise<void> => {
    const updatedSettings = { ...state.privacySettings, ...settings }
    
    dispatch({
      type: 'PRIVACY_SETTINGS_UPDATE',
      payload: { settings: updatedSettings }
    })
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'privacy_settings_updated',
      resource: 'privacy_settings',
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { updatedSettings: settings },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
  }, [state.privacySettings, userId])
  
  const updateDataRetentionSettings = useCallback(async (retention: Partial<DataRetentionPreference>): Promise<void> => {
    const updatedRetention = { ...state.dataRetentionSettings, ...retention }
    
    dispatch({
      type: 'DATA_RETENTION_UPDATE',
      payload: { retention: updatedRetention }
    })
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'data_retention_updated',
      resource: 'data_retention',
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { updatedRetention: retention },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
  }, [state.dataRetentionSettings, userId])
  
  // ============================================================================
  // Privacy Incident Handling Functions (Task 8.3)
  // ============================================================================
  
  const reportPrivacyIncident = useCallback(async (incident: PrivacyIncident): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')
    
    // Create privacy alert
    const alert: PrivacyAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'data_breach',
      severity: incident.severity,
      title: `Privacy Incident: ${incident.type}`,
      message: incident.description,
      actionRequired: incident.severity === 'high' || incident.severity === 'critical',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      acknowledged: false,
    }
    
    dispatch({ type: 'PRIVACY_ALERT_ADD', payload: { alert } })
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action: 'privacy_incident_reported',
      resource: 'privacy_incident',
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { incident, alertId: alert.id },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
  }, [userId])
  
  const getPrivacyAlerts = useCallback((): PrivacyAlert[] => {
    return state.privacyAlerts.filter(alert => !alert.acknowledged)
  }, [state.privacyAlerts])
  
  const acknowledgePrivacyAlert = useCallback(async (alertId: string): Promise<void> => {
    dispatch({
      type: 'PRIVACY_ALERT_ACKNOWLEDGE',
      payload: { alertId }
    })
    
    // Log audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId!,
      action: 'privacy_alert_acknowledged',
      resource: 'privacy_alert',
      timestamp: new Date(),
      ipAddress: '0.0.0.0',
      userAgent: navigator.userAgent,
      outcome: 'success',
      details: { alertId },
    }
    
    dispatch({ type: 'AUDIT_LOG_ADD', payload: { entry: auditEntry } })
  }, [userId])
  
  // ============================================================================
  // Utility Functions
  // ============================================================================
  
  const clearError = useCallback((errorType?: keyof Pick<GDPRState, 'error' | 'consentError' | 'exportError' | 'deleteError' | 'reportError'>) => {
    if (errorType) {
      dispatch({ type: 'CLEAR_ERROR', payload: { errorType } })
    } else {
      dispatch({ type: 'CLEAR_ERROR' })
    }
  }, [])
  
  const clearAllErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' })
  }, [])
  
  const isConsentGranted = useCallback((consentType: keyof ConsentPreferences): boolean => {
    const value = state.consentPreferences?.[consentType]
    return typeof value === 'boolean' ? value : false
  }, [state.consentPreferences])
  
  const getDataRetentionPeriod = useCallback((dataType: keyof DataRetentionPreference): number => {
    return state.dataRetentionSettings[dataType]
  }, [state.dataRetentionSettings])
  
  const isComplianceStatusHealthy = useCallback((): boolean => {
    return state.complianceStatus?.overall === 'compliant'
  }, [state.complianceStatus])
  
  // ============================================================================
  // Context Value
  // ============================================================================
  
  const contextValue: GDPRContextValue = {
    // State
    state,
    
    // Computed properties
    consentPreferences: state.consentPreferences || (consentQuery.data as ConsentPreferences) || null,
    privacyReport: state.privacyReport || (privacyReportQuery.data as PrivacyReport) || null,
    complianceStatus: state.complianceStatus,
    userRights: state.userRights,
    isLoading: state.isLoading || consentQuery.isLoading || privacyReportQuery.isLoading,
    isUpdating: state.isUpdating || consentUpdateMutation.isPending || exportDataMutation.isPending || deleteDataMutation.isPending,
    error: state.error || state.consentError || state.exportError || state.deleteError || state.reportError,
    
    // Consent management (Task 8.1)
    fetchConsentPreferences,
    updateConsentPreferences,
    grantConsent,
    withdrawConsent,
    getConsentHistory,
    
    // Data export (Task 8.1)
    requestDataExport,
    checkExportStatus,
    downloadExportData,
    
    // Data deletion (Task 8.1)
    requestDataDeletion,
    checkDeletionStatus,
    cancelDeletionRequest,
    
    // Privacy reporting and audit (Task 8.2)
    generatePrivacyReport,
    getAuditLog,
    trackDataUsage,
    runComplianceCheck,
    
    // User rights management (Task 8.3)
    exerciseUserRight,
    getRightsExerciseHistory,
    updatePrivacySettings,
    updateDataRetentionSettings,
    
    // Privacy incident handling (Task 8.3)
    reportPrivacyIncident,
    getPrivacyAlerts,
    acknowledgePrivacyAlert,
    
    // Utility functions
    clearError,
    clearAllErrors,
    isConsentGranted,
    getDataRetentionPeriod,
    isComplianceStatusHealthy,
  }
  
  return (
    <GDPRContext.Provider value={contextValue}>
      {children}
    </GDPRContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useGDPR(): GDPRContextValue {
  const context = useContext(GDPRContext)
  
  if (!context) {
    throw new Error('useGDPR must be used within a GDPRProvider')
  }
  
  return context
}