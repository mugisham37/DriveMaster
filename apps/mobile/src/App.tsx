import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import Navigation from './navigation'
import { syncService } from './services/syncService'
import { socketService } from './services/socketService'
import { notificationService } from './services/notificationService'
import { useRealTimeStore } from './store/realTimeStore'
import { database } from './database'

export default function App() {
  useEffect(() => {
    // Initialize services when app starts
    const initializeApp = async () => {
      try {
        console.log('Initializing DriveMaster app...')

        // Database is initialized automatically in its constructor
        // Sync service is initialized automatically in its constructor

        // Initialize real-time functionality
        useRealTimeStore.getState().initializeRealTime()

        // Initialize push notifications
        await notificationService.registerForPushNotifications()

        console.log('App initialized successfully')
      } catch (error) {
        console.error('App initialization failed:', error)
      }
    }

    initializeApp()

    // Cleanup on unmount
    return () => {
      syncService.destroy()
      socketService.destroy()
      notificationService.destroy()
      useRealTimeStore.getState().cleanup()
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Navigation />
    </GestureHandlerRootView>
  )
}
