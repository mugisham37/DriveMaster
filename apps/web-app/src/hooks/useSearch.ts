import { useState, useEffect, useCallback, useMemo } from 'react'
import { debounce } from 'lodash'

export interface SearchOptions {
  debounceMs?: number
  minQueryLength?: number
  maxResults?: number
  caseSensitive?: boolean
}

export interface UseSearchReturn<T> {
  query: string
  setQuery: (query: string) => void
  results: T[]
  isSearching: boolean
  hasSearched: boolean
  clearSearch: () => void
}

export function useSearch<T>(
  searchFunction: (query: string) => Promise<T[]> | T[],
  options: SearchOptions = {}
): UseSearchReturn<T> {
  const {
    debounceMs = 300,
    minQueryLength = 1,
    maxResults = 50
  } = options

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setResults([])
        setIsSearching(false)
        setHasSearched(false)
        return
      }

      setIsSearching(true)
      
      try {
        const searchResults = await searchFunction(searchQuery)
        const limitedResults = searchResults.slice(0, maxResults)
        setResults(limitedResults)
        setHasSearched(true)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, debounceMs),
    [searchFunction, debounceMs, minQueryLength, maxResults]
  )

  // Effect to trigger search when query changes
  useEffect(() => {
    debouncedSearch(query)
    
    // Cleanup function to cancel pending debounced calls
    return () => {
      debouncedSearch.cancel()
    }
  }, [query, debouncedSearch])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setIsSearching(false)
    setHasSearched(false)
    debouncedSearch.cancel()
  }, [debouncedSearch])

  return {
    query,
    setQuery,
    results,
    isSearching,
    hasSearched,
    clearSearch
  }
}

// Local search hook for client-side filtering
export function useLocalSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  options: SearchOptions = {}
): UseSearchReturn<T> {
  const { caseSensitive = false } = options

  const searchFunction = useCallback((query: string): T[] => {
    if (!query.trim()) return items

    const searchTerm = caseSensitive ? query : query.toLowerCase()
    
    return items.filter(item => {
      return searchFields.some(field => {
        const fieldValue = item[field]
        if (typeof fieldValue === 'string') {
          const value = caseSensitive ? fieldValue : fieldValue.toLowerCase()
          return value.includes(searchTerm)
        }
        return false
      })
    })
  }, [items, searchFields, caseSensitive])

  return useSearch(searchFunction, options)
}