import { NotificationType, NotificationPriority } from '../dto/notification.dto';
import { NotificationStatus, DeliveryChannel } from '../entities/notification.entity';

export interface INotificationProvider {
    send(notification: NotificationPayload): Promise<NotificationResult>;
    sendBatch(notifications: NotificationPayload[]): Promise<NotificationResult[]>;
    validateToken(token: string): Promise<boolean>;
}

export interface NotificationPayload {
    userId: string;
    deviceTokens: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    priority: NotificationPriority;
    silent?: boolean;
    badge?: number;
    sound?: string;
    imageUrl?: string;
    clickAction?: string;
}

export interface NotificationResult {
    success: boolean;
    messageId?: string;
    failedTokens?: string[];
    error?: string;
    deliveredCount: number;
    failedCount: number;
}

export interface INotificationScheduler {
    schedule(notification: ScheduledNotification): Promise<string>;
    cancel(jobId: string): Promise<boolean>;
    reschedule(jobId: string, newTime: Date): Promise<boolean>;
    getScheduledNotifications(userId: string): Promise<ScheduledNotification[]>;
}

export interface ScheduledNotification {
    id?: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
    scheduledFor: Date;
    priority: NotificationPriority;
    templateId?: string;
    templateData?: Record<string, any>;
    tags?: string[];
}

export interface INotificationTemplate {
    render(templateId: string, data: Record<string, any>): Promise<RenderedNotification>;
    validate(templateId: string, data: Record<string, any>): Promise<ValidationResult>;
    getTemplate(templateId: string): Promise<NotificationTemplate | null>;
    createTemplate(template: CreateTemplateRequest): Promise<NotificationTemplate>;
}

export interface RenderedNotification {
    title: string;
    body: string;
    data?: Record<string, any>;
}

export interface ValidationResult {
    isValid: boolean;
    missingVariables?: string[];
    errors?: string[];
}

export interface CreateTemplateRequest {
    name: string;
    type: NotificationType;
    titleTemplate: string;
    bodyTemplate: string;
    defaultData?: Record<string, any>;
    requiredVariables?: string[];
}

export interface NotificationTemplate {
    id: string;
    name: string;
    type: NotificationType;
    titleTemplate: string;
    bodyTemplate: string;
    defaultData?: Record<string, any>;
    requiredVariables?: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface INotificationAnalytics {
    trackDelivery(notificationId: string, result: NotificationResult): Promise<void>;
    trackOpen(notificationId: string, userId: string): Promise<void>;
    trackClick(notificationId: string, userId: string, action?: string): Promise<void>;
    getDeliveryStats(userId?: string, type?: NotificationType, dateRange?: DateRange): Promise<DeliveryStats>;
    getEngagementStats(userId?: string, type?: NotificationType, dateRange?: DateRange): Promise<EngagementStats>;
}

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export interface DeliveryStats {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    failureReasons: Record<string, number>;
}

export interface EngagementStats {
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
    avgTimeToOpen?: number;
    avgTimeToClick?: number;
}

export interface IDeviceTokenManager {
    registerToken(userId: string, token: string, platform: 'ios' | 'android' | 'web', metadata?: Record<string, any>): Promise<void>;
    removeToken(userId: string, token: string): Promise<void>;
    getActiveTokens(userId: string): Promise<string[]>;
    cleanupInvalidTokens(invalidTokens: string[]): Promise<void>;
    getUserTokens(userId: string, platform?: 'ios' | 'android' | 'web'): Promise<DeviceTokenInfo[]>;
}

export interface DeviceTokenInfo {
    token: string;
    platform: 'ios' | 'android' | 'web';
    isActive: boolean;
    lastUsedAt: Date;
    appVersion?: string;
    deviceInfo?: Record<string, any>;
}

export interface NotificationPreferences {
    userId: string;
    enabledTypes: NotificationType[];
    quietHours?: {
        start: string; // HH:mm format
        end: string;   // HH:mm format
        timezone: string;
    };
    frequency: {
        [key in NotificationType]?: 'immediate' | 'daily' | 'weekly' | 'disabled';
    };
    channels: {
        [key in NotificationType]?: DeliveryChannel[];
    };
}

export interface INotificationPreferences {
    getPreferences(userId: string): Promise<NotificationPreferences>;
    updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void>;
    shouldSendNotification(userId: string, type: NotificationType, scheduledTime: Date): Promise<boolean>;
}