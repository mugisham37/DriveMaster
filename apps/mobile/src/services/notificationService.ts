import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import * as Linking from 'expo-linking'
import { useAuthStore } from '../store'
import { useRealTimeStore } from '../store/realTimeStore'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export interface PushNotificationData {
  type: 'friend_request' | 'friend_challenge' | 'achievement' | 'reminder' | 'system'
  title: string
  body: string
  data?: any
  deepLink?: string
  scheduledFor?: Date
}

export interface NotificationPermissions {
  granted: boolean
  canAskAgain: boolean
  status: Notifications.PermissionStatus
}

export class NotificationService {
  private expoPushToken: string | null = null
  private notificationListener: any = null
  private responseListener: any = null

  constructor() {
    this.initializeNotifications()
  }

  private async initializeNotifications() {
    // Set up notification listeners
    this.setupNotificationListeners()

    // Request permissions and get push token
    await this.requestPermissions()
    await this.registerForPushNotifications()
  }

  private setupNotificationListeners() {
    // Listener for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification)
      this.handleNotificationReceived(notification)
    })

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response)
      this.handleNotificationResponse(response)
    })
  }

  private handleNotificationReceived(notification: Notifications.Notification) {
    const { request } = notification
    const { content } = request

    // Add to real-time store
    useRealTimeStore.getState().addNotification({
      type: content.data?.type || 'system',
      title: content.title || 'Notification',
      message: content.body || '',
      data: content.data,
      isRead: false,
      actionRequired: content.data?.actionRequired || false,
    })

    // Update badge count
    this.updateBadgeCount()
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { notification } = response
    const { content } = notification.request
    const deepLink = content.data?.deepLink

    // Mark notification as read
    if (content.data?.notificationId) {
      useRealTimeStore.getState().markNotificationAsRead(content.data.notificationId)
    }

    // Handle deep linking
    if (deepLink) {
      await this.handleDeepLink(deepLink, content.data)
    }

    // Handle specific notification types
    await this.handleNotificationAction(content.data?.type, content.data)
  }

  private async handleDeepLink(deepLink: string, data?: any) {
    try {
      console.log('Handling deep link:', deepLink)

      // Parse the deep link
      const url = Linking.parse(deepLink)

      // Import navigation reference
      const { navigationRef } = require('../navigation/NavigationService')

      // Handle different deep link patterns
      switch (url.hostname) {
        case 'challenge':
          // Navigate to live challenge screen
          if (url.path && navigationRef.isReady()) {
            const challengeId = url.path.replace('/', '')
            navigationRef.navigate('LiveChallenge', { challengeId, ...data })
          }
          break

        case 'friend':
          // Navigate to friend profile or friend request
          if (url.path && navigationRef.isReady()) {
            const friendId = url.path.replace('/', '')
            if (data?.type === 'friend_request') {
              navigationRef.navigate('Friends', { tab: 'requests', friendId })
            } else {
              navigationRef.navigate('Friends', { tab: 'profile', friendId })
            }
          }
          break

        case 'achievement':
          // Navigate to achievement details
          if (url.path && navigationRef.isReady()) {
            const achievementId = url.path.replace('/', '')
            navigationRef.navigate('Progress', { tab: 'achievements', achievementId })
          }
          break

        case 'learn':
          // Navigate to learning session
          if (navigationRef.isReady()) {
            const category = url.path?.replace('/', '') || data?.category
            navigationRef.navigate('Learn', { category })
          }
          break

        case 'leaderboard':
          // Navigate to leaderboard
          if (navigationRef.isReady()) {
            navigationRef.navigate('Leaderboard', data)
          }
          break

        default:
          // Navigate to main app
          if (navigationRef.isReady()) {
            navigationRef.navigate('Main')
          }
          break
      }
    } catch (error) {
      console.error('Error handling deep link:', error)
    }
  }

  private async handleNotificationAction(type?: string, data?: any) {
    switch (type) {
      case 'friend_request':
        // Auto-navigate to friends screen
        console.log('Handle friend request action')
        break

      case 'friend_challenge':
        // Auto-navigate to challenge acceptance screen
        console.log('Handle friend challenge action')
        break

      case 'achievement':
        // Show achievement celebration
        console.log('Handle achievement action')
        break

      case 'reminder':
        // Navigate to learning session
        console.log('Handle reminder action')
        break

      default:
        console.log('No specific action for notification type:', type)
        break
    }
  }

  async requestPermissions(): Promise<NotificationPermissions> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications')
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied' as Notifications.PermissionStatus,
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    const granted = finalStatus === 'granted'
    const canAskAgain = finalStatus === 'undetermined'

    if (!granted) {
      console.log('Failed to get push token for push notification!')
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })

      // Create specific channels for different notification types
      await this.createNotificationChannels()
    }

    return {
      granted,
      canAskAgain,
      status: finalStatus,
    }
  }

  private async createNotificationChannels() {
    if (Platform.OS !== 'android') return

    const channels = [
      {
        id: 'friend_requests',
        name: 'Friend Requests',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notifications for friend requests and social interactions',
      },
      {
        id: 'challenges',
        name: 'Challenges',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notifications for live challenges and competitions',
      },
      {
        id: 'achievements',
        name: 'Achievements',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Notifications for unlocked achievements and milestones',
      },
      {
        id: 'reminders',
        name: 'Learning Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Reminders to continue learning',
      },
      {
        id: 'system',
        name: 'System Notifications',
        importance: Notifications.AndroidImportance.LOW,
        description: 'System updates and maintenance notifications',
      },
    ]

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: channel.importance,
        description: channel.description,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })
    }
  }

  async registerForPushNotifications(): Promise<string | null> {
    try {
      const permissions = await this.requestPermissions()

      if (!permissions.granted) {
        console.log('Push notification permissions not granted')
        return null
      }

      // Get the token that uniquely identifies this device
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })

      this.expoPushToken = token.data
      console.log('Expo push token:', this.expoPushToken)

      // Send token to backend for storage
      await this.sendTokenToBackend(this.expoPushToken)

      return this.expoPushToken
    } catch (error) {
      console.error('Error getting push token:', error)
      return null
    }
  }

  private async sendTokenToBackend(token: string) {
    try {
      const { user, tokens } = useAuthStore.getState()

      if (!user || !tokens) {
        console.log('User not authenticated, cannot send push token')
        return
      }

      // In a real implementation, this would make an API call
      console.log('Sending push token to backend:', token)

      // const response = await fetch('/api/users/push-token', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${tokens.accessToken}`,
      //   },
      //   body: JSON.stringify({
      //     pushToken: token,
      //     platform: Platform.OS,
      //     deviceId: Constants.deviceId,
      //   }),
      // })

      // if (!response.ok) {
      //   throw new Error('Failed to register push token')
      // }

      console.log('Push token registered successfully')
    } catch (error) {
      console.error('Error sending push token to backend:', error)
    }
  }

  async scheduleLocalNotification(notificationData: PushNotificationData): Promise<string> {
    const { type, title, body, data, deepLink, scheduledFor } = notificationData

    const channelId = this.getChannelIdForType(type)

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          type,
          deepLink,
          notificationId: `local-${Date.now()}`,
        },
        sound: true,
      },
      trigger: scheduledFor ? { date: scheduledFor } : null,
      identifier: `${type}-${Date.now()}`,
    })

    return notificationId
  }

  async scheduleReminderNotification(
    title: string,
    body: string,
    scheduledFor: Date,
    data?: any,
  ): Promise<string> {
    return this.scheduleLocalNotification({
      type: 'reminder',
      title,
      body,
      data,
      deepLink: 'drivemaster://learn',
      scheduledFor,
    })
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }

  async updateBadgeCount(): Promise<void> {
    const { unreadNotificationCount } = useRealTimeStore.getState()
    await Notifications.setBadgeCountAsync(unreadNotificationCount)
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0)
  }

  private getChannelIdForType(type: string): string {
    switch (type) {
      case 'friend_request':
        return 'friend_requests'
      case 'friend_challenge':
        return 'challenges'
      case 'achievement':
        return 'achievements'
      case 'reminder':
        return 'reminders'
      case 'system':
        return 'system'
      default:
        return 'default'
    }
  }

  // Get scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync()
  }

  // Get notification permissions status
  async getPermissionsStatus(): Promise<NotificationPermissions> {
    const { status } = await Notifications.getPermissionsAsync()
    return {
      granted: status === 'granted',
      canAskAgain: status === 'undetermined',
      status,
    }
  }

  // Handle notification settings
  async openNotificationSettings(): Promise<void> {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:')
    } else {
      await Linking.openSettings()
    }
  }

  // Cleanup
  destroy(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener)
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener)
    }
  }

  // Get push token
  getPushToken(): string | null {
    return this.expoPushToken
  }
}

// Singleton instance
export const notificationService = new NotificationService()
export default notificationService
