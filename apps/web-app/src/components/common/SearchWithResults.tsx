import React, { useState, useRef, useEffect, useCallback } from 'react'
import { SearchInput } from './SearchInput'
import { assembleClassNames } from '@/utils/assemble-classnames'

export interface SearchResult {
  id: string | number
  title: string
  subtitle?: string
  icon?: string
  url?: string
}

export interface SearchWithResultsProps {
  placeholder?: string
  className?: string
  onSearch: (query: string) => Promise<SearchResult[]> | SearchResult[]
  onSelect: (result: SearchResult) => void
  renderResult?: (result: SearchResult, isHighlighted: boolean) => React.ReactNode
  maxResults?: number
  minQueryLength?: number
  debounceMs?: number
  showNoResults?: boolean
  noResultsText?: string
}

const RESULTS_CONTAINER_CLASSNAMES = 
  'absolute top-full left-0 right-0 bg-backgroundColorA border-1 border-borderColor6 rounded-8 shadow-lg z-50 max-h-[300px] overflow-y-auto'

const RESULT_ITEM_CLASSNAMES = 
  'px-16 py-12 cursor-pointer hover:bg-backgroundColorB border-b-1 border-borderColor6 last:border-b-0'

const HIGHLIGHTED_RESULT_CLASSNAMES = 'bg-backgroundColorB'

export function SearchWithResults({
  placeholder = 'Search...',
  className = '',
  onSearch,
  onSelect,
  renderResult,
  maxResults = 10,
  minQueryLength = 1,
  debounceMs = 300,
  showNoResults = true,
  noResultsText = 'No results found'
}: SearchWithResultsProps): React.ReactElement {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [hasSearched, setHasSearched] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([])
      setIsSearching(false)
      setHasSearched(false)
      setShowResults(false)
      return
    }

    setIsSearching(true)
    
    try {
      const searchResults = await onSearch(searchQuery)
      const limitedResults = searchResults.slice(0, maxResults)
      setResults(limitedResults)
      setHasSearched(true)
      setShowResults(true)
      setHighlightedIndex(-1)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setHasSearched(true)
    } finally {
      setIsSearching(false)
    }
  }, [onSearch, minQueryLength, maxResults])

  // Handle query change with debouncing
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      performSearch(newQuery)
    }, debounceMs)
  }, [performSearch, debounceMs])

  // Handle result selection
  const handleSelect = useCallback((result: SearchResult) => {
    onSelect(result)
    setQuery('')
    setResults([])
    setShowResults(false)
    setHighlightedIndex(-1)
    setHasSearched(false)
  }, [onSelect])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          const selectedResult = results[highlightedIndex]
          if (selectedResult) {
            handleSelect(selectedResult)
          }
        }
        break
      case 'Escape':
        setShowResults(false)
        setHighlightedIndex(-1)
        searchInputRef.current?.blur()
        break
    }
  }, [showResults, results, highlightedIndex, handleSelect])

  // Handle focus events
  const handleFocus = useCallback(() => {
    if (results.length > 0 || (hasSearched && showNoResults)) {
      setShowResults(true)
    }
  }, [results.length, hasSearched, showNoResults])

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setShowResults(false)
      setHighlightedIndex(-1)
    }, 150)
  }, [])

  // Default result renderer
  const defaultRenderResult = useCallback((result: SearchResult, isHighlighted: boolean) => (
    <div 
      className={assembleClassNames(
        RESULT_ITEM_CLASSNAMES,
        isHighlighted ? HIGHLIGHTED_RESULT_CLASSNAMES : ''
      )}
      onClick={() => handleSelect(result)}
    >
      <div className="font-medium text-textColor2">{result.title}</div>
      {result.subtitle && (
        <div className="text-14 text-textColor6 mt-1">{result.subtitle}</div>
      )}
    </div>
  ), [handleSelect])

  const resultRenderer = renderResult || defaultRenderResult

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const shouldShowNoResults = showNoResults && hasSearched && results.length === 0 && query.length >= minQueryLength && !isSearching

  return (
    <div className={assembleClassNames('relative', className)}>
      <SearchInput
        ref={searchInputRef}
        value={query}
        onChange={handleQueryChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      
      {showResults && (results.length > 0 || shouldShowNoResults) && (
        <div ref={resultsRef} className={RESULTS_CONTAINER_CLASSNAMES}>
          {isSearching && (
            <div className="px-16 py-12 text-textColor6 text-center">
              Searching...
            </div>
          )}
          
          {!isSearching && results.length > 0 && results.map((result, index) => (
            <div key={result.id}>
              {resultRenderer(result, index === highlightedIndex)}
            </div>
          ))}
          
          {!isSearching && shouldShowNoResults && (
            <div className="px-16 py-12 text-textColor6 text-center">
              {noResultsText}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
