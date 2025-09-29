import { Redis } from 'ioredis'
import {
  NotificationContext,
  NotificationDeliveryResult,
  NotificationPriority,
} from '../types/notification.js'

export class DeliveryManager {
  private redis: Redis
  private pushProviders: Map<string, PushProvider> = new Map()
  private emailProvider?: EmailProvider
  private smsProvider?: SMSProvider

  constructor(redis: Redis) {
    this.redis = redis
    this.initializeProviders()
  }

  async deliver(notification: NotificationContext): Promise<NotificationDeliveryResult> {
    const deliveryMethods = await this.determineDeliveryMethods(notification.userId)

    // Try delivery methods in order of preference
    for (const method of deliveryMethods) {
      try {
        const result = await this.deliverViaMethod(notification, method)
        if (result.success) {
          await this.recordSuccessfulDelivery(notification, result)
          return result
        }
      } catch (error) {
        console.error(`Delivery failed via ${method}:`, error)
        await this.recordFailedDelivery(notification, method, error as Error)
      }
    }

    // All delivery methods failed
    return {
      success: false,
      error: 'All delivery methods failed',
      timestamp: new Date(),
      platform: 'push',
    }
  }

  async confirmDelivery(
    deliveryId: string,
    confirmationType: 'delivered' | 'opened' | 'clicked',
  ): Promise<void> {
    const confirmationData = {
      deliveryId,
      type: confirmationType,
      timestamp: new Date().toISOString(),
    }

    await this.redis.lpush(`delivery_confirmations:${deliveryId}`, JSON.stringify(confirmationData))
    await this.redis.expire(`delivery_confirmations:${deliveryId}`, 30 * 24 * 60 * 60) // 30 days
  }

  async getDeliveryStatus(deliveryId: string): Promise<DeliveryStatus> {
    const confirmations = await this.redis.lrange(`delivery_confirmations:${deliveryId}`, 0, -1)

    const status: DeliveryStatus = {
      deliveryId,
      delivered: false,
      opened: false,
      clicked: false,
      deliveryTime: null,
      openTime: null,
      clickTime: null,
    }

    for (const confirmation of confirmations) {
      const data = JSON.parse(confirmation)
      switch (data.type) {
        case 'delivered':
          status.delivered = true
          status.deliveryTime = new Date(data.timestamp)
          break
        case 'opened':
          status.opened = true
          status.openTime = new Date(data.timestamp)
          break
        case 'clicked':
          status.clicked = true
          status.clickTime = new Date(data.timestamp)
          break
      }
    }

    return status
  }

  private async deliverViaMethod(
    notification: NotificationContext,
    method: DeliveryMethod,
  ): Promise<NotificationDeliveryResult> {
    switch (method.type) {
      case 'push':
        return this.deliverPushNotification(notification, method.provider)
      case 'email':
        return this.deliverEmailNotification(notification)
      case 'sms':
        return this.deliverSMSNotification(notification)
      default:
        throw new Error(`Unsupported delivery method: ${method.type}`)
    }
  }

  private async deliverPushNotification(
    notification: NotificationContext,
    providerName: string,
  ): Promise<NotificationDeliveryResult> {
    const provider = this.pushProviders.get(providerName)
    if (!provider) {
      throw new Error(`Push provider not found: ${providerName}`)
    }

    // Get user's device tokens
    const deviceTokens = await this.getUserDeviceTokens(notification.userId)
    if (deviceTokens.length === 0) {
      throw new Error('No device tokens found for user')
    }

    const pushPayload = {
      title: notification.content.title,
      body: notification.content.body,
      data: {
        notificationId: notification.metadata?.notificationId,
        actionUrl: notification.content.actionUrl,
        ...notification.content.customData,
      },
      priority: this.mapPriorityToPush(notification.priority),
      badge: await this.getUserBadgeCount(notification.userId),
    }

    // Send to all user devices
    const results = await Promise.allSettled(
      deviceTokens.map((token) => provider.send(token, pushPayload)),
    )

    // Check if at least one delivery succeeded
    const successfulDeliveries = results.filter((result) => result.status === 'fulfilled')

    if (successfulDeliveries.length > 0) {
      return {
        success: true,
        deliveryId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        platform: 'push',
      }
    } else {
      throw new Error('Failed to deliver to any device')
    }
  }

  private async deliverEmailNotification(
    notification: NotificationContext,
  ): Promise<NotificationDeliveryResult> {
    if (!this.emailProvider) {
      throw new Error('Email provider not configured')
    }

    const userEmail = await this.getUserEmail(notification.userId)
    if (!userEmail) {
      throw new Error('User email not found')
    }

    const emailPayload = {
      to: userEmail,
      subject: notification.content.title,
      html: this.generateEmailHTML(notification),
      text: notification.content.body,
    }

    const result = await this.emailProvider.send(emailPayload)

    return {
      success: true,
      deliveryId: result.messageId,
      timestamp: new Date(),
      platform: 'email',
    }
  }

  private async deliverSMSNotification(
    notification: NotificationContext,
  ): Promise<NotificationDeliveryResult> {
    if (!this.smsProvider) {
      throw new Error('SMS provider not configured')
    }

    const userPhone = await this.getUserPhone(notification.userId)
    if (!userPhone) {
      throw new Error('User phone number not found')
    }

    const smsPayload = {
      to: userPhone,
      body: `${notification.content.title}\n\n${notification.content.body}`,
    }

    const result = await this.smsProvider.send(smsPayload)

    return {
      success: true,
      deliveryId: result.messageId,
      timestamp: new Date(),
      platform: 'sms',
    }
  }

  private async determineDeliveryMethods(userId: string): Promise<DeliveryMethod[]> {
    const preferences = await this.getUserDeliveryPreferences(userId)
    const methods: DeliveryMethod[] = []

    // Primary method: Push notifications
    if (preferences.enablePushNotifications) {
      methods.push({ type: 'push', provider: 'firebase', priority: 1 })
    }

    // Fallback methods based on preferences
    if (preferences.enableEmailNotifications) {
      methods.push({ type: 'email', provider: 'sendgrid', priority: 2 })
    }

    if (preferences.enableSMSNotifications) {
      methods.push({ type: 'sms', provider: 'twilio', priority: 3 })
    }

    // Sort by priority
    return methods.sort((a, b) => a.priority - b.priority)
  }

  private mapPriorityToPush(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'high'
      case NotificationPriority.HIGH:
        return 'high'
      case NotificationPriority.NORMAL:
        return 'normal'
      case NotificationPriority.LOW:
        return 'low'
      default:
        return 'normal'
    }
  }

  private generateEmailHTML(notification: NotificationContext): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.content.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #4CAF50; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${notification.content.title}</h1>
          </div>
          <div class="content">
            <p>${notification.content.body}</p>
            ${
              notification.content.actionUrl
                ? `<a href="${notification.content.actionUrl}" class="button">Take Action</a>`
                : ''
            }
          </div>
        </div>
      </body>
      </html>
    `
  }

  private async recordSuccessfulDelivery(
    notification: NotificationContext,
    result: NotificationDeliveryResult,
  ): Promise<void> {
    const record = {
      userId: notification.userId,
      notificationId: notification.metadata?.notificationId,
      deliveryId: result.deliveryId,
      platform: result.platform,
      success: true,
      timestamp: result.timestamp.toISOString(),
    }

    await this.redis.lpush('delivery_log', JSON.stringify(record))
    await this.redis.ltrim('delivery_log', 0, 9999) // Keep last 10k records
  }

  private async recordFailedDelivery(
    notification: NotificationContext,
    method: string,
    error: Error,
  ): Promise<void> {
    const record = {
      userId: notification.userId,
      notificationId: notification.metadata?.notificationId,
      method,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }

    await this.redis.lpush('delivery_failures', JSON.stringify(record))
    await this.redis.ltrim('delivery_failures', 0, 9999) // Keep last 10k records
  }

  private async getUserDeviceTokens(userId: string): Promise<string[]> {
    const tokens = await this.redis.smembers(`device_tokens:${userId}`)
    if (!tokens || !Array.isArray(tokens)) {
      return []
    }
    return tokens.filter((token) => token && token.length > 0)
  }

  private async getUserBadgeCount(userId: string): Promise<number> {
    const count = await this.redis.get(`badge_count:${userId}`)
    return count ? parseInt(count) : 0
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    return this.redis.get(`user_email:${userId}`)
  }

  private async getUserPhone(userId: string): Promise<string | null> {
    return this.redis.get(`user_phone:${userId}`)
  }

  private async getUserDeliveryPreferences(userId: string): Promise<any> {
    const data = await this.redis.get(`delivery_preferences:${userId}`)
    return data
      ? JSON.parse(data)
      : {
          enablePushNotifications: true,
          enableEmailNotifications: false,
          enableSMSNotifications: false,
        }
  }

  private initializeProviders(): void {
    // Initialize Firebase Cloud Messaging
    this.pushProviders.set('firebase', new FirebasePushProvider())

    // Initialize other providers as needed
    // this.emailProvider = new SendGridEmailProvider()
    // this.smsProvider = new TwilioSMSProvider()
  }
}

// Provider interfaces and implementations
interface PushProvider {
  send(deviceToken: string, payload: PushPayload): Promise<PushResult>
}

interface EmailProvider {
  send(payload: EmailPayload): Promise<EmailResult>
}

interface SMSProvider {
  send(payload: SMSPayload): Promise<SMSResult>
}

interface PushPayload {
  title: string
  body: string
  data?: Record<string, any>
  priority?: string
  badge?: number
}

interface EmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

interface SMSPayload {
  to: string
  body: string
}

interface PushResult {
  success: boolean
  messageId?: string
  error?: string
}

interface EmailResult {
  messageId: string
}

interface SMSResult {
  messageId: string
}

interface DeliveryMethod {
  type: 'push' | 'email' | 'sms'
  provider: string
  priority: number
}

interface DeliveryStatus {
  deliveryId: string
  delivered: boolean
  opened: boolean
  clicked: boolean
  deliveryTime: Date | null
  openTime: Date | null
  clickTime: Date | null
}

// Mock Firebase provider for demonstration
class FirebasePushProvider implements PushProvider {
  async send(deviceToken: string, payload: PushPayload): Promise<PushResult> {
    // In production, this would use the Firebase Admin SDK
    console.log(`Sending push notification to ${deviceToken}:`, payload)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Simulate 95% success rate
    if (Math.random() > 0.05) {
      return {
        success: true,
        messageId: `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }
    } else {
      return {
        success: false,
        error: 'Device token invalid or expired',
      }
    }
  }
}
