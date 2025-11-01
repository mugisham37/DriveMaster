/**
 * Test Component for Analytics Functionality
 * 
 * Provides a simple interface to test analytics tracking and data retrieval
 * functionality for development and debugging purposes.
 */

'use client'

import React, { useState } from 'react'
import { 
  useAnalyticsTracking, 
  useAnalyticsData, 
  useAnalyticsMetrics,
  useAnalyticsSummary 
} from '../../hooks/useNotificationAnalytics'
import { DeliveryResult, AnalyticsQueryParams } from '../../types/notification-service'

export const AnalyticsTestComponent: React.FC = () => {
  const [testNotificationId] = useState('test-notification-123')
  const [testUserId] = useState('test-user-456')
  
  const { 
    trackDelivery, 
    trackOpen, 
    trackClick, 
    trackDismiss, 
    isTracking, 
    metrics 
  } = useAnalyticsTracking()
  
  const { metrics: serviceMetrics, resetMetrics, flush } = useAnalyticsMetrics()
  
  // Test analytics data retrieval
  const analyticsParams: AnalyticsQueryParams = {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate: new Date(),
    groupBy: 'day',
    metrics: ['delivery_rate', 'open_rate', 'click_rate']
  }
  
  const { data: analyticsData, isLoading } = useAnalyticsData(analyticsParams)
  const { summary } = useAnalyticsSummary(analyticsParams)

  const handleTrackDelivery = async () => {
    const result: DeliveryResult = {
      success: true,
      channel: 'push',
      timestamp: new Date(),
      error: undefined
    }
    await trackDelivery(testNotificationId, result)
  }

  const handleTrackOpen = async () => {
    await trackOpen(testNotificationId)
  }

  const handleTrackClick = async () => {
    await trackClick(testNotificationId, 'test-action')
  }

  const handleTrackDismiss = async () => {
    await trackDismiss(testNotificationId)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Analytics Test Component</h2>
      
      {/* Tracking Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Event Tracking</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={handleTrackDelivery}
            disabled={isTracking}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Track Delivery
          </button>
          <button
            onClick={handleTrackOpen}
            disabled={isTracking}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Track Open
          </button>
          <button
            onClick={handleTrackClick}
            disabled={isTracking}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Track Click
          </button>
          <button
            onClick={handleTrackDismiss}
            disabled={isTracking}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Track Dismiss
          </button>
        </div>
        {isTracking && (
          <p className="mt-2 text-sm text-gray-600">Tracking event...</p>
        )}
      </div>

      {/* Service Metrics */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Service Metrics</h3>
          <div className="space-x-2">
            <button
              onClick={flush}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Flush Queue
            </button>
            <button
              onClick={resetMetrics}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Reset Metrics
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {serviceMetrics.eventsQueued}
            </div>
            <div className="text-sm text-gray-600">Queued</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {serviceMetrics.eventsSent}
            </div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {serviceMetrics.eventsFailedToSend}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {serviceMetrics.batchesSent}
            </div>
            <div className="text-sm text-gray-600">Batches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {serviceMetrics.averageBatchSize.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Avg Batch</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {serviceMetrics.offlineQueueSize}
            </div>
            <div className="text-sm text-gray-600">Offline</div>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Analytics Summary (Last 7 Days)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summary.totalNotifications}
              </div>
              <div className="text-sm text-gray-600">Total Notifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(summary.averageDeliveryRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Delivery Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(summary.averageOpenRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Open Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {(summary.averageClickRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Click Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Raw Analytics Data */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Raw Analytics Data</h3>
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ) : analyticsData && analyticsData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Click Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.period).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.metrics.delivery_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.metrics.open_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.metrics.click_rate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No analytics data available for the selected period.</p>
        )}
      </div>

      {/* Test Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Test Information</h4>
        <p className="text-sm text-gray-600">
          <strong>Test Notification ID:</strong> {testNotificationId}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Test User ID:</strong> {testUserId}
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Click the tracking buttons above to generate test analytics events. 
          The service metrics will update in real-time to show queued and sent events.
        </p>
      </div>
    </div>
  )
}

export default AnalyticsTestComponent