import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

// ============================================================================
// Progressive Data Loader for Analytics Dashboard
// ============================================================================

export interface DataPriority {
  key: string
  priority: 'critical' | 'important' | 'normal' | 'low'
  queryFn: () => Promise<unknown>
  queryKey: unknown[]
  dependencies?: string[]
  gcTime?: number // Updated from cacheTime
  staleTime?: number
}

export interface ProgressiveDataLoaderProps {
  dataSources: DataPriority[]
  onDataLoaded?: (key: string, data: any) => void
  onError?: (key: string, error: Error) => void
  onComplete?: (loadedData: Record<string, any>) => void
  children: (props: {
    data: Record<string, unknown>
    loading: Record<string, boolean>
    errors: Record<string, Error | null>
    progress: number
    isComplete: boolean
  }) => React.ReactNode
}

// Priority order for loading
const PRIORITY_ORDER = {
  critical: 0,
  important: 1,
  normal: 2,
  low: 3
}

// Hook for managing progressive loading
export const useProgressiveDataLoader = (dataSources: DataPriority[]) => {
  const [loadedData, setLoadedData] = useState<Record<string, unknown>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, Error | null>>({})
  const [currentPhase, setCurrentPhase] = useState(0)

  // Sort data sources by priority and dependencies
  const sortedDataSources = useMemo(() => {
    const sources = [...dataSources]
    
    // First sort by priority
    sources.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    
    // Then handle dependencies
    const resolved: DataPriority[] = []
    const remaining = [...sources]
    
    while (remaining.length > 0) {
      const canResolve = remaining.filter(source => 
        !source.dependencies || 
        source.dependencies.every(dep => resolved.some(r => r.key === dep))
      )
      
      if (canResolve.length === 0) {
        // Circular dependency or missing dependency, add remaining as-is
        resolved.push(...remaining)
        break
      }
      
      resolved.push(...canResolve)
      canResolve.forEach(source => {
        const index = remaining.indexOf(source)
        remaining.splice(index, 1)
      })
    }
    
    return resolved
  }, [dataSources])

  // Group sources by priority for phased loading
  const phases = useMemo(() => {
    const phaseMap: Record<string, DataPriority[]> = {}
    
    sortedDataSources.forEach(source => {
      if (!phaseMap[source.priority]) {
        phaseMap[source.priority] = []
      }
      phaseMap[source.priority].push(source)
    })
    
    return ['critical', 'important', 'normal', 'low']
      .map(priority => phaseMap[priority])
      .filter(Boolean)
  }, [sortedDataSources])

  // Calculate progress
  const progress = useMemo(() => {
    const totalSources = dataSources.length
    const loadedCount = Object.keys(loadedData).length
    return totalSources > 0 ? (loadedCount / totalSources) * 100 : 0
  }, [dataSources.length, loadedData])

  const isComplete = useMemo(() => 
    dataSources.every(source => loadedData[source.key] !== undefined || errors[source.key]),
    [dataSources, loadedData, errors]
  )

  return {
    loadedData,
    loadingStates,
    errors,
    progress,
    isComplete,
    phases,
    currentPhase,
    setCurrentPhase,
    setLoadedData,
    setLoadingStates,
    setErrors
  }
}

// Individual data loader component
const DataLoader: React.FC<{
  source: DataPriority
  onDataLoaded: (key: string, data: unknown) => void
  onError: (key: string, error: Error) => void
  onLoadingChange: (key: string, loading: boolean) => void
  enabled: boolean
}> = ({ source, onDataLoaded, onError, onLoadingChange, enabled }) => {
  const { data, error, isLoading } = useQuery({
    queryKey: source.queryKey,
    queryFn: source.queryFn,
    enabled,
    gcTime: source.gcTime || 300000, // 5 minutes default
    staleTime: source.staleTime || 30000,   // 30 seconds default
    retry: (failureCount) => {
      // Retry less for low priority items
      const maxRetries = source.priority === 'critical' ? 3 : 
                        source.priority === 'important' ? 2 : 1
      return failureCount < maxRetries
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  useEffect(() => {
    onLoadingChange(source.key, isLoading)
  }, [isLoading, source.key, onLoadingChange])

  useEffect(() => {
    if (data !== undefined) {
      onDataLoaded(source.key, data)
    }
  }, [data, source.key, onDataLoaded])

  useEffect(() => {
    if (error) {
      onError(source.key, error as Error)
    }
  }, [error, source.key, onError])

  return null
}

// Main Progressive Data Loader component
export const ProgressiveDataLoader: React.FC<ProgressiveDataLoaderProps> = ({
  dataSources,
  onDataLoaded,
  onError,
  onComplete,
  children
}) => {
  const {
    loadedData,
    loadingStates,
    errors,
    progress,
    isComplete,
    phases,
    currentPhase,
    setCurrentPhase,
    setLoadedData,
    setLoadingStates,
    setErrors
  } = useProgressiveDataLoader(dataSources)

  // Handle data loading
  const handleDataLoaded = useCallback((key: string, data: unknown) => {
    setLoadedData(prev => ({ ...prev, [key]: data }))
    onDataLoaded?.(key, data)
  }, [onDataLoaded, setLoadedData])

  // Handle errors
  const handleError = useCallback((key: string, error: Error) => {
    setErrors(prev => ({ ...prev, [key]: error }))
    onError?.(key, error)
  }, [onError, setErrors])

  // Handle loading state changes
  const handleLoadingChange = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }))
  }, [setLoadingStates])

  // Auto-advance phases when current phase is complete
  useEffect(() => {
    if (currentPhase < phases.length - 1) {
      const currentPhaseSources = phases[currentPhase]
      const isCurrentPhaseComplete = currentPhaseSources?.every(source => 
        loadedData[source.key] !== undefined || errors[source.key]
      )
      
      if (isCurrentPhaseComplete) {
        // Small delay before starting next phase to avoid overwhelming the server
        const timer = setTimeout(() => {
          setCurrentPhase(prev => prev + 1)
        }, 100)
        
        return () => clearTimeout(timer)
      }
    }
  }, [currentPhase, phases, loadedData, errors, setCurrentPhase])

  // Call onComplete when all data is loaded
  useEffect(() => {
    if (isComplete) {
      onComplete?.(loadedData)
    }
  }, [isComplete, loadedData, onComplete])

  return (
    <>
      {phases.map((phaseSources, phaseIndex) =>
        phaseSources?.map(source => (
          <DataLoader
            key={source.key}
            source={source}
            onDataLoaded={handleDataLoaded}
            onError={handleError}
            onLoadingChange={handleLoadingChange}
            enabled={phaseIndex <= currentPhase}
          />
        ))
      )}
      
      {children({
        data: loadedData,
        loading: loadingStates,
        errors,
        progress,
        isComplete
      })}
    </>
  )

  return (
    <>
      {phases.map((phaseSources, phaseIndex) =>
        phaseSources?.map(source => (
          <DataLoader
            key={source.key}
            source={source}
            onDataLoaded={handleDataLoaded}
            onError={handleError}
            onLoadingChange={handleLoadingChange}
            enabled={phaseIndex <= currentPhase}
          />
        ))
      )}
      
      {children({
        data: loadedData,
        loading: loadingStates,
        errors,
        progress,
        isComplete
      })}
    </>
  )
}

// Progress indicator component
export const LoadingProgress: React.FC<{
  progress: number
  phase?: string
  className?: string
}> = ({ progress, phase, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
      <span>Loading analytics data...</span>
      <span>{Math.round(progress)}%</span>
    </div>
    
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
    
    {phase && (
      <div className="text-xs text-gray-500 dark:text-gray-500">
        Current phase: {phase}
      </div>
    )}
  </div>
)

// Smooth transition wrapper
export const SmoothTransition: React.FC<{
  show: boolean
  children: React.ReactNode
  className?: string
  duration?: number
}> = ({ show, children, className = '', duration = 300 }) => (
  <div
    className={`transition-all ease-in-out ${className}`}
    style={{
      transitionDuration: `${duration}ms`,
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(10px)',
      visibility: show ? 'visible' : 'hidden'
    }}
  >
    {children}
  </div>
)

// Loading state indicator
export const LoadingStateIndicator: React.FC<{
  loading: Record<string, boolean>
  errors: Record<string, Error | null>
  dataSources: DataPriority[]
}> = ({ loading, errors, dataSources }) => {
  const criticalLoading = dataSources
    .filter(s => s.priority === 'critical')
    .some(s => loading[s.key])
  
  const hasErrors = Object.values(errors).some(Boolean)
  
  if (criticalLoading) {
    return (
      <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        <span className="text-sm">Loading critical data...</span>
      </div>
    )
  }
  
  if (hasErrors) {
    return (
      <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-sm">Some data failed to load</span>
      </div>
    )
  }
  
  const anyLoading = Object.values(loading).some(Boolean)
  if (anyLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
        <div className="animate-pulse w-2 h-2 bg-current rounded-full"></div>
        <span className="text-sm">Loading additional data...</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span className="text-sm">All data loaded</span>
    </div>
  )
}

export default ProgressiveDataLoader