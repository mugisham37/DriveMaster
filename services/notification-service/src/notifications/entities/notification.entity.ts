import { NotificationType, NotificationPriority } from '../dto/notification.dto';

export enum NotificationStatus {
    PENDING = 'pending',
    SCHEDULED = 'scheduled',
    SENT = 'sent',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum DeliveryChannel {
    PUSH = 'push',
    EMAIL = 'email',
    IN_APP = 'in_app',
}

export class NotificationEntity {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
    priority: NotificationPriority;
    status: NotificationStatus;
    channels: DeliveryChannel[];

    // Scheduling
    scheduledFor?: Date;
    sentAt?: Date;
    deliveredAt?: Date;

    // Tracking
    deviceTokens?: string[];
    deliveryAttempts: number;
    lastAttemptAt?: Date;
    errorMessage?: string;

    // Analytics
    opened?: boolean;
    openedAt?: Date;
    clicked?: boolean;
    clickedAt?: Date;

    // Metadata
    tags?: string[];
    templateId?: string;
    templateData?: Record<string, any>;
    campaignId?: string;

    // Audit
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<NotificationEntity>) {
        Object.assign(this, partial);
        this.deliveryAttempts = this.deliveryAttempts || 0;
        this.status = this.status || NotificationStatus.PENDING;
        this.priority = this.priority || NotificationPriority.NORMAL;
        this.channels = this.channels || [DeliveryChannel.PUSH];
        this.createdAt = this.createdAt || new Date();
        this.updatedAt = this.updatedAt || new Date();
    }
}

export class NotificationTemplate {
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

    constructor(partial: Partial<NotificationTemplate>) {
        Object.assign(this, partial);
        this.isActive = this.isActive ?? true;
        this.createdAt = this.createdAt || new Date();
        this.updatedAt = this.updatedAt || new Date();
    }
}

export class DeviceToken {
    id: string;
    userId: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    appVersion?: string;
    deviceInfo?: Record<string, any>;
    isActive: boolean;
    lastUsedAt: Date;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<DeviceToken>) {
        Object.assign(this, partial);
        this.isActive = this.isActive ?? true;
        this.lastUsedAt = this.lastUsedAt || new Date();
        this.createdAt = this.createdAt || new Date();
        this.updatedAt = this.updatedAt || new Date();
    }
}