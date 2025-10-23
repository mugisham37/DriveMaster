import React from 'react'

interface PaginationProps {
  current: number
  total: number
  setPage: (page: number) => void
  className?: string
}

export function Pagination({ 
  current, 
  total, 
  setPage, 
  className = '' 
}: PaginationProps): React.JSX.Element {
  const handlePrevious = () => {
    if (current > 1) {
      setPage(current - 1)
    }
  }

  const handleNext = () => {
    if (current < total) {
      setPage(current + 1)
    }
  }

  const handlePageClick = (page: number) => {
    setPage(page)
  }

  const getVisiblePages = () => {
    const pages: number[] = []
    const maxVisible = 5
    
    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i)
      }
    } else {
      const start = Math.max(1, current - 2)
      const end = Math.min(total, start + maxVisible - 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }
    
    return pages
  }

  if (total <= 1) {
    return <div></div>
  }

  return (
    <div className={`pagination flex items-center justify-center space-x-2 ${className}`}>
      <button
        onClick={handlePrevious}
        disabled={current === 1}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      
      {getVisiblePages().map((page) => (
        <button
          key={page}
          onClick={() => handlePageClick(page)}
          className={`px-3 py-2 text-sm font-medium border rounded-md ${
            page === current
              ? 'text-blue-600 bg-blue-50 border-blue-500'
              : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}
      
      <button
        onClick={handleNext}
        disabled={current === total}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  )
}