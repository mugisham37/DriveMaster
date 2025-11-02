import React from 'react'

// ============================================================================
// Analytics Skeleton Components for Progressive Loading
// ============================================================================

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = '100%', 
  height = '20px' 
}) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    style={{ width, height }}
  />
)

// Metric Card Skeleton
export const MetricCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton width="60%" height="16px" />
      <Skeleton width="24px" height="24px" className="rounded-full" />
    </div>
    <Skeleton width="40%" height="32px" />
    <div className="flex items-center space-x-2">
      <Skeleton width="12px" height="12px" className="rounded-full" />
      <Skeleton width="80px" height="14px" />
    </div>
  </div>
)

// Chart Skeleton
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="40%" height="20px" />
        <div className="flex space-x-2">
          <Skeleton width="60px" height="32px" className="rounded" />
          <Skeleton width="60px" height="32px" className="rounded" />
        </div>
      </div>
      <div className="relative" style={{ height }}>
        {/* Chart area */}
        <div className="absolute inset-0 flex items-end justify-between space-x-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              width="100%"
              height={`${Math.random() * 80 + 20}%`}
              className="rounded-t"
            />
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex justify-center space-x-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton width="12px" height="12px" className="rounded-full" />
            <Skeleton width="60px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  </div>
)

// Table Skeleton
export const TableSkeleton: React.FC<{ 
  rows?: number
  columns?: number 
}> = ({ rows = 5, columns = 4 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
    {/* Header */}
    <div className="border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="80%" height="16px" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                width={colIndex === 0 ? "90%" : "70%"} 
                height="14px" 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Dashboard Grid Skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton width="200px" height="32px" />
      <div className="flex space-x-2">
        <Skeleton width="100px" height="36px" className="rounded" />
        <Skeleton width="120px" height="36px" className="rounded" />
      </div>
    </div>
    
    {/* Metrics Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton height={250} />
      <ChartSkeleton height={250} />
    </div>
    
    {/* Table */}
    <TableSkeleton rows={8} columns={5} />
  </div>
)

// Alert Panel Skeleton
export const AlertPanelSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton width="120px" height="20px" />
      <Skeleton width="80px" height="16px" />
    </div>
    
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start space-x-3 p-3 rounded border border-gray-200 dark:border-gray-700">
          <Skeleton width="16px" height="16px" className="rounded-full mt-1" />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height="16px" />
            <Skeleton width="90%" height="14px" />
            <Skeleton width="60px" height="12px" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Connection Status Skeleton
export const ConnectionStatusSkeleton: React.FC = () => (
  <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded">
    <Skeleton width="12px" height="12px" className="rounded-full" />
    <Skeleton width="100px" height="14px" />
  </div>
)

// Progressive Loading Container
interface ProgressiveLoadingProps {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  isLoading,
  skeleton,
  children,
  className = ''
}) => (
  <div className={`transition-opacity duration-300 ${className}`}>
    {isLoading ? skeleton : children}
  </div>
)

// Staggered Loading Container for multiple items
interface StaggeredLoadingProps {
  items: Array<{
    isLoading: boolean
    skeleton: React.ReactNode
    content: React.ReactNode
  }>
  staggerDelay?: number
  className?: string
}

export const StaggeredLoading: React.FC<StaggeredLoadingProps> = ({
  items,
  staggerDelay = 100,
  className = ''
}) => (
  <div className={className}>
    {items.map((item, index) => (
      <div
        key={index}
        className="transition-all duration-300"
        style={{
          animationDelay: `${index * staggerDelay}ms`,
          animation: item.isLoading ? 'none' : 'fadeIn 0.3s ease-in-out'
        }}
      >
        {item.isLoading ? item.skeleton : item.content}
      </div>
    ))}
  </div>
)