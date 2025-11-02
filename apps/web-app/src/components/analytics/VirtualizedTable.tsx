import React, { useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'

// Define the props type for list child components
interface ListChildComponentProps {
  index: number
  style: React.CSSProperties
  data: any
}

// ============================================================================
// Virtualized Table Component for Large Analytics Datasets
// ============================================================================

export interface TableColumn<T = Record<string, unknown>> {
  key: string
  header: string
  width: number
  render?: (value: unknown, row: T, index: number) => React.ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

export interface VirtualizedTableProps<T = Record<string, unknown>> {
  data: T[]
  columns: TableColumn<T>[]
  height: number
  rowHeight?: number
  className?: string
  onRowClick?: (row: T, index: number) => void
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  loading?: boolean
  emptyMessage?: string
}

// Row component for react-window
const TableRow: React.FC<ListChildComponentProps> = ({ 
  index, 
  style, 
  data: { rows, columns, onRowClick } 
}) => {
  const row = rows[index]
  const isEven = index % 2 === 0

  const handleClick = useCallback(() => {
    if (onRowClick) {
      onRowClick(row, index)
    }
  }, [onRowClick, row, index])

  return (
    <div
      style={style}
      className={`
        flex items-center border-b border-gray-200 dark:border-gray-700 
        ${isEven ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}
        ${onRowClick ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer' : ''}
        transition-colors duration-150
      `}
      onClick={handleClick}
    >
      {columns.map((column: TableColumn) => {
        const value = row[column.key]
        const content = column.render ? column.render(value, row, index) : value

        return (
          <div
            key={column.key}
            className={`
              px-4 py-3 truncate
              ${column.align === 'center' ? 'text-center' : ''}
              ${column.align === 'right' ? 'text-right' : ''}
            `}
            style={{ width: column.width, minWidth: column.width }}
            title={typeof content === 'string' ? content : undefined}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}

// Header component
const TableHeader: React.FC<{
  columns: TableColumn[]
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
}> = ({ columns, sortBy, sortDirection, onSort }) => {
  const handleSort = useCallback((column: TableColumn) => {
    if (!column.sortable || !onSort) return

    const newDirection = 
      sortBy === column.key && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(column.key, newDirection)
  }, [sortBy, sortDirection, onSort])

  return (
    <div className="flex bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
      {columns.map((column) => (
        <div
          key={column.key}
          className={`
            px-4 py-3 font-semibold text-gray-900 dark:text-gray-100
            ${column.align === 'center' ? 'text-center' : ''}
            ${column.align === 'right' ? 'text-right' : ''}
            ${column.sortable ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' : ''}
            transition-colors duration-150
          `}
          style={{ width: column.width, minWidth: column.width }}
          onClick={() => handleSort(column)}
        >
          <div className="flex items-center justify-between">
            <span className="truncate">{column.header}</span>
            {column.sortable && (
              <div className="ml-2 flex flex-col">
                <svg
                  className={`w-3 h-3 ${
                    sortBy === column.key && sortDirection === 'asc'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
                <svg
                  className={`w-3 h-3 -mt-1 ${
                    sortBy === column.key && sortDirection === 'desc'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ transform: 'rotate(180deg)' }}
                >
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Loading overlay
const LoadingOverlay: React.FC = () => (
  <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10">
    <div className="flex items-center space-x-2">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span className="text-gray-600 dark:text-gray-400">Loading data...</span>
    </div>
  </div>
)

// Empty state
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
    <div className="text-center">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="mt-2">{message}</p>
    </div>
  </div>
)

// Main VirtualizedTable component
export const VirtualizedTable = <T extends Record<string, any>>({
  data,
  columns,
  height,
  rowHeight = 60,
  className = '',
  onRowClick,
  sortBy,
  sortDirection,
  onSort,
  loading = false,
  emptyMessage = 'No data available'
}: VirtualizedTableProps<T>) => {
  // Calculate total width for horizontal scrolling
  const totalWidth = useMemo(() => 
    columns.reduce((sum, col) => sum + col.width, 0), 
    [columns]
  )

  // Prepare data for react-window
  const itemData = useMemo(() => ({
    rows: data,
    columns,
    onRowClick
  }), [data, columns, onRowClick])

  if (loading) {
    return (
      <div className={`relative bg-white dark:bg-gray-900 rounded-lg shadow ${className}`}>
        <TableHeader 
          columns={columns} 
          sortBy={sortBy || undefined} 
          sortDirection={sortDirection || undefined} 
          onSort={onSort || undefined} 
        />
        <div style={{ height: height - 60 }} className="relative">
          <LoadingOverlay />
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow ${className}`}>
        <TableHeader 
          columns={columns} 
          sortBy={sortBy || undefined} 
          sortDirection={sortDirection || undefined} 
          onSort={onSort || undefined} 
        />
        <EmptyState message={emptyMessage} />
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden ${className}`}>
      <TableHeader 
        columns={columns} 
        sortBy={sortBy || undefined} 
        sortDirection={sortDirection || undefined} 
        onSort={onSort || undefined} 
      />
      
      <div style={{ height: height - 60 }}>
        <List
          height={height - 60}
          itemCount={data.length}
          itemSize={rowHeight}
          itemData={itemData}
          width={totalWidth}
          className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        >
          {TableRow}
        </List>
      </div>
      
      {/* Row count indicator */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
        Showing {data.length} rows
      </div>
    </div>
  )
}

// Hook for managing table state
export const useVirtualizedTable = <T extends Record<string, any>>(
  initialData: T[],
  initialSortBy?: string,
  initialSortDirection: 'asc' | 'desc' = 'asc'
) => {
  const [data, setData] = React.useState(initialData)
  const [sortBy, setSortBy] = React.useState(initialSortBy)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(initialSortDirection)

  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortBy(column)
    setSortDirection(direction)
    
    const sortedData = [...data].sort((a, b) => {
      const aVal = a[column]
      const bVal = b[column]
      
      if (aVal === bVal) return 0
      
      const comparison = aVal < bVal ? -1 : 1
      return direction === 'asc' ? comparison : -comparison
    })
    
    setData(sortedData)
  }, [data])

  const updateData = useCallback((newData: T[]) => {
    setData(newData)
  }, [])

  return {
    data,
    sortBy,
    sortDirection,
    handleSort,
    updateData
  }
}

export default VirtualizedTable