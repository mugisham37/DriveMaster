/**
 * AnalyticsChart Component
 * 
 * Flexible chart component for displaying analytics data with real-time updates,
 * multiple chart types, and responsive design.
 * 
 * Requirements: 3.1, 3.2, 6.3
 */

'use client'

import React, { memo, useMemo, useRef, useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler
} from 'chart.js'
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Icon } from '@/components/common/Icon'
import { cn } from '@/lib/utils'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler
)

// ============================================================================
// Types
// ============================================================================

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area'

export interface ChartDataPoint {
  x: string | number | Date
  y: number
  label?: string
}

export interface ChartDataset {
  label: string
  data: ChartDataPoint[]
  color?: string
  backgroundColor?: string
  borderColor?: string
  fill?: boolean
}

export interface AnalyticsChartProps {
  title: string
  type: ChartType
  datasets: ChartDataset[]
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  isRealtime?: boolean
  lastUpdated?: Date
  height?: number
  showLegend?: boolean
  showGrid?: boolean
  showTooltips?: boolean
  animate?: boolean
  responsive?: boolean
  className?: string
  onDataPointClick?: (dataPoint: ChartDataPoint, datasetIndex: number) => void
}

// ============================================================================
// Chart Configuration
// ============================================================================

const defaultColors = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
]

const getChartOptions = (
  type: ChartType,
  showLegend: boolean,
  showGrid: boolean,
  showTooltips: boolean,
  animate: boolean,
  onDataPointClick?: (dataPoint: ChartDataPoint, datasetIndex: number) => void
) => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animate ? {
      duration: 750,
      easing: 'easeInOutQuart' as const
    } : false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: showTooltips,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || ''
            const value = typeof context.parsed.y === 'number' 
              ? context.parsed.y.toLocaleString()
              : context.parsed.y
            return `${label}: ${value}`
          }
        }
      }
    },
    onClick: onDataPointClick ? (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const element = elements[0]
        const datasetIndex = element.datasetIndex
        const dataIndex = element.index
        const dataset = event.chart.data.datasets[datasetIndex]
        const dataPoint = dataset.data[dataIndex]
        onDataPointClick(dataPoint, datasetIndex)
      }
    } : undefined
  }

  // Chart-specific options
  if (type === 'line' || type === 'bar' || type === 'area') {
    return {
      ...baseOptions,
      scales: {
        x: {
          display: true,
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            font: {
              size: 11
            }
          }
        },
        y: {
          display: true,
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            font: {
              size: 11
            },
            callback: (value: any) => {
              if (typeof value === 'number') {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`
                }
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}K`
                }
                return value.toLocaleString()
              }
              return value
            }
          }
        }
      }
    }
  }

  return baseOptions
}

// ============================================================================
// Component
// ============================================================================

export const AnalyticsChart = memo<AnalyticsChartProps>(({
  title,
  type,
  datasets,
  isLoading = false,
  isError = false,
  errorMessage,
  isRealtime = false,
  lastUpdated,
  height = 300,
  showLegend = true,
  showGrid = true,
  showTooltips = true,
  animate = true,
  responsive = true,
  className,
  onDataPointClick
}) => {
  const chartRef = useRef<any>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Prepare chart data
  const chartData = useMemo(() => {
    const processedDatasets = datasets.map((dataset, index) => {
      const color = dataset.color || defaultColors[index % defaultColors.length]
      
      const baseDataset = {
        label: dataset.label,
        data: dataset.data.map(point => ({
          x: point.x,
          y: point.y
        })),
        borderColor: dataset.borderColor || color,
        backgroundColor: dataset.backgroundColor || (
          type === 'pie' || type === 'doughnut' 
            ? defaultColors.slice(0, dataset.data.length)
            : type === 'area'
            ? `${color}20`
            : `${color}80`
        ),
        borderWidth: type === 'line' || type === 'area' ? 2 : 1,
        fill: type === 'area' ? true : (dataset.fill ?? false),
        tension: type === 'line' || type === 'area' ? 0.4 : 0,
        pointRadius: type === 'line' || type === 'area' ? 4 : 0,
        pointHoverRadius: type === 'line' || type === 'area' ? 6 : 0,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }

      return baseDataset
    })

    return {
      labels: datasets[0]?.data.map(point => point.x) || [],
      datasets: processedDatasets
    }
  }, [datasets, type])

  // Chart options
  const options = useMemo(() => 
    getChartOptions(type, showLegend, showGrid, showTooltips, animate, onDataPointClick),
    [type, showLegend, showGrid, showTooltips, animate, onDataPointClick]
  )

  // Handle real-time updates with smooth animations
  useEffect(() => {
    if (isRealtime && chartRef.current && !isAnimating) {
      setIsAnimating(true)
      const chart = chartRef.current
      
      // Update chart data
      chart.data = chartData
      chart.update('active')
      
      setTimeout(() => setIsAnimating(false), 750)
    }
  }, [chartData, isRealtime, isAnimating])

  // Render chart component based on type
  const renderChart = () => {
    const commonProps = {
      ref: chartRef,
      data: chartData,
      options,
      height,
      width: undefined // Let responsive handle width
    }

    switch (type) {
      case 'line':
      case 'area':
        return <Line {...commonProps} />
      case 'bar':
        return <Bar {...commonProps} />
      case 'pie':
        return <Pie {...commonProps} />
      case 'doughnut':
        return <Doughnut {...commonProps} />
      default:
        return <Line {...commonProps} />
    }
  }

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {isRealtime && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          )}
        </div>
        
        {lastUpdated && !isLoading && (
          <span className="text-xs text-gray-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Chart Content */}
      <div style={{ height: `${height}px` }} className="relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LoadingSpinner size="large" />
              <p className="mt-2 text-sm text-gray-500">Loading chart data...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-600">
              <Icon icon="alert-circle" className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">Failed to load chart</p>
              {errorMessage && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              )}
            </div>
          </div>
        ) : datasets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Icon icon="bar-chart" className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">No data available</p>
              <p className="text-sm">Chart will appear when data is loaded</p>
            </div>
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </Card>
  )
})

AnalyticsChart.displayName = 'AnalyticsChart'

// ============================================================================
// Chart Grid Component
// ============================================================================

export interface ChartGridProps {
  charts: Array<AnalyticsChartProps & { id: string }>
  columns?: 1 | 2
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export const ChartGrid: React.FC<ChartGridProps> = ({
  charts,
  columns = 2,
  gap = 'md',
  className
}) => {
  const getGridCols = () => {
    return columns === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
  }

  const getGapSize = () => {
    switch (gap) {
      case 'sm':
        return 'gap-4'
      case 'lg':
        return 'gap-8'
      default:
        return 'gap-6'
    }
  }

  return (
    <div className={cn(
      'grid',
      getGridCols(),
      getGapSize(),
      className
    )}>
      {charts.map(({ id, ...chartProps }) => (
        <AnalyticsChart key={id} {...chartProps} />
      ))}
    </div>
  )
}