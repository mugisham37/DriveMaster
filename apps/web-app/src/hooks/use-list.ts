import { useState, useCallback } from 'react'
import { Request } from './request-query'

// List hook to preserve exact behavior from Rails implementation
export function useList<T = any>(initialRequest: Request<T>) {
  const [request, setRequest] = useState(initialRequest)

  const setCriteria = useCallback((criteria: string) => {
    setRequest(prev => ({
      ...prev,
      query: { ...prev.query, criteria, page: undefined }
    }))
  }, [])

  const setOrder = useCallback((order: string) => {
    setRequest(prev => ({
      ...prev,
      query: { ...prev.query, order, page: undefined }
    }))
  }, [])

  const setPage = useCallback((page: number) => {
    setRequest(prev => ({
      ...prev,
      query: { ...prev.query, page }
    }))
  }, [])

  const setQuery = useCallback((query: T) => {
    setRequest(prev => ({
      ...prev,
      query
    }))
  }, [])

  return {
    request,
    setCriteria,
    setOrder,
    setPage,
    setQuery,
  }
}