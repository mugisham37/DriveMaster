/**
 * Test component for notification service integration hooks
 * This component demonstrates the usage of all notification hooks
 */

"use client";

import React from 'react';
import {
  useNotifications,
  useNotificationMutations,
  useDeviceTokenRegistration,
  useRealtimeNotifications,
  useNotificationPreferences
} from '@/hooks';

export function NotificationServiceTest() {
  // Test core notification hooks
  const {
    notifications,
    isLoading: notificationsLoading,
    unreadCount,
    totalCount
  } = useNotifications({
    limit: 10,
    status: 'unread'
  });

  // Test notification mutations
  const {
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationMutations();

  // Test device token registration
  const {
    isRegistered,
    isRegistering,
    register: registerDeviceToken
  } = useDeviceTokenRegistration({
    autoRegister: false
  });

  // Test real-time notifications
  const {
    isConnected,
    realtimeNotifications,
    connectionState
  } = useRealtimeNotifications({
    enabled: true,
    showToasts: true
  });

  // Test notification preferences
  const {
    preferences,
    isLoading: preferencesLoading,
    updateEnabledTypes
  } = useNotificationPreferences();

  if (notificationsLoading || preferencesLoading) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Notification Service Test</h2>
        <div className="text-gray-600">Loading notification data...</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Notification Service Integration Test</h2>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>WebSocket: {connectionState}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isRegistered ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span>Push Notifications: {isRegistered ? 'Registered' : 'Not Registered'}</span>
          </div>
        </div>
      </div>

      {/* Notification Stats */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Notification Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
            <div className="text-sm text-gray-600">Unread</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">{totalCount}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Recent Notifications</h3>
        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border rounded-lg ${
                  notification.status.isRead ? 'bg-gray-50' : 'bg-white border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    {!notification.status.isRead && (
                      <button
                        onClick={() => markAsRead.mutate(notification.id)}
                        disabled={markAsRead.isLoading}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification.mutate(notification.id)}
                      disabled={deleteNotification.isLoading}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            No notifications found
          </div>
        )}
      </div>

      {/* Real-time Notifications */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Real-time Notifications</h3>
        {realtimeNotifications.length > 0 ? (
          <div className="space-y-2">
            {realtimeNotifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className="p-3 border-l-4 border-green-400 bg-green-50 rounded"
              >
                <h4 className="font-medium text-green-800">{notification.title}</h4>
                <p className="text-sm text-green-700 mt-1">{notification.body}</p>
                <div className="text-xs text-green-600 mt-2">
                  Just received • {new Date(notification.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">
            No real-time notifications yet
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
        {preferences ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Enabled Types</h4>
              <div className="flex flex-wrap gap-2">
                {preferences.enabledTypes.map((type) => (
                  <span
                    key={type}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                  >
                    {type.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
            
            {preferences.quietHours && preferences.quietHours.enabled && (
              <div>
                <h4 className="font-medium mb-2">Quiet Hours</h4>
                <div className="text-sm text-gray-600">
                  {preferences.quietHours.start} - {preferences.quietHours.end}
                  {preferences.quietHours.timezone && ` (${preferences.quietHours.timezone})`}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">No preferences loaded</div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isLoading || unreadCount === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {markAllAsRead.isLoading ? 'Marking...' : 'Mark All Read'}
          </button>
          
          {!isRegistered && (
            <button
              onClick={() => registerDeviceToken()}
              disabled={isRegistering}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegistering ? 'Registering...' : 'Enable Push Notifications'}
            </button>
          )}
          
          <button
            onClick={() => updateEnabledTypes(['achievement', 'system'])}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Update Preferences
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <details className="mt-8">
        <summary className="cursor-pointer font-medium text-gray-700">Debug Information</summary>
        <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify({
              notificationsCount: notifications.length,
              unreadCount,
              totalCount,
              isConnected,
              connectionState,
              isRegistered,
              realtimeNotificationsCount: realtimeNotifications.length,
              preferencesLoaded: !!preferences
            }, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}