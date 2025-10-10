import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    CreateNotificationDto,
    SendNotificationDto,
    ScheduleNotificationDto,
    NotificationType,
    NotificationPriority
} from '../dto/notification.dto';
import {
    NotificationEntity,
    NotificationStatus,
    DeliveryChannel,
    DeviceToken
} from '../entities/notification.entity';
import {
    INotificationProvider,
    NotificationPayload,
    NotificationResult,
    ScheduledNotification
} from '../interfaces/notification.interface';
import { FCMProvider } from '../providers/fcm.provider';
import { APNSProvider } from '../providers/apns.provider';
import { NotificationTemplateService } from './template.service';
import { DeviceTokenService } from './device-token.service';
import { forwardRef, Inject } from '@nestjs/common';
import { NotificationSchedulerService } from './scheduler.service';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private notifications: Map<string, NotificationEntity> = new Map();

    constructor(
        private configService: ConfigService,
        private fcmProvider: FCMProvider,
        private apnsProvider: APNSProvider,
        private templateService: NotificationTemplateService,
        private deviceTokenService: DeviceTokenService,
        @Inject(forwardRef(() => NotificationSchedulerService))
        private schedulerService: NotificationSchedulerService,
    ) { }

    async createNotification(dto: CreateNotificationDto): Promise<NotificationEntity> {
        try {
            let title = dto.title;
            let body = dto.body;
            let data = dto.data;

            // Render template if provided
            if (dto.templateId) {
                const rendered = await this.templateService.render(dto.templateId, dto.templateData || {});
                title = rendered.title;
                body = rendered.body;
                data = { ...data, ...rendered.data };
            }

            const notification = new NotificationEntity({
                id: this.generateNotificationId(),
                userId: dto.userId,
                type: dto.type,
                title,
                body,
                data,
                priority: dto.priority || NotificationPriority.NORMAL,
                status: dto.scheduledFor ? NotificationStatus.SCHEDULED : NotificationStatus.PENDING,
                channels: [DeliveryChannel.PUSH], // Default to push notifications
                scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
                tags: dto.tags,
                templateId: dto.templateId,
                templateData: dto.templateData,
            });

            this.notifications.set(notification.id, notification);

            // Schedule if needed
            if (dto.scheduledFor) {
                await this.scheduleNotification(notification);
            }

            this.logger.log(`Created notification ${notification.id} for user ${dto.userId}`);
            return notification;
        } catch (error) {
            this.logger.error('Failed to create notification', error);
            throw error;
        }
    }

    async sendNotification(dto: SendNotificationDto): Promise<NotificationResult> {
        try {
            // Get user's device tokens
            const deviceTokens = await this.deviceTokenService.getActiveTokens(dto.userId);

            if (deviceTokens.length === 0) {
                this.logger.warn(`No active device tokens found for user ${dto.userId}`);
                return {
                    success: false,
                    error: 'No active device tokens',
                    deliveredCount: 0,
                    failedCount: 0,
                };
            }

            const payload: NotificationPayload = {
                userId: dto.userId,
                deviceTokens,
                title: dto.title,
                body: dto.body,
                data: dto.data,
                priority: dto.priority || NotificationPriority.NORMAL,
                silent: dto.silent,
            };

            // Send via multiple providers for redundancy
            const results = await Promise.allSettled([
                this.fcmProvider.send(payload),
                this.apnsProvider.send(payload),
            ]);

            // Combine results
            let totalDelivered = 0;
            let totalFailed = 0;
            const errors: string[] = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    totalDelivered += result.value.deliveredCount;
                    totalFailed += result.value.failedCount;
                    if (result.value.error) {
                        errors.push(result.value.error);
                    }
                } else {
                    const providerName = index === 0 ? 'FCM' : 'APNS';
                    errors.push(`${providerName}: ${result.reason.message}`);
                }
            });

            const finalResult: NotificationResult = {
                success: totalDelivered > 0,
                deliveredCount: totalDelivered,
                failedCount: totalFailed,
                error: errors.length > 0 ? errors.join('; ') : undefined,
            };

            this.logger.log(`Sent notification to user ${dto.userId}: ${totalDelivered} delivered, ${totalFailed} failed`);
            return finalResult;
        } catch (error) {
            this.logger.error(`Failed to send notification to user ${dto.userId}`, error);
            throw error;
        }
    }

    async scheduleNotification(notification: NotificationEntity): Promise<string> {
        if (!notification.scheduledFor) {
            throw new BadRequestException('Notification must have scheduledFor date');
        }

        const scheduledNotification: ScheduledNotification = {
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: notification.data,
            scheduledFor: notification.scheduledFor,
            priority: notification.priority,
            templateId: notification.templateId,
            templateData: notification.templateData,
            tags: notification.tags,
        };

        const jobId = await this.schedulerService.schedule(scheduledNotification);

        // Update notification status
        notification.status = NotificationStatus.SCHEDULED;
        this.notifications.set(notification.id, notification);

        return jobId;
    }

    async cancelScheduledNotification(notificationId: string): Promise<boolean> {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            throw new NotFoundException(`Notification ${notificationId} not found`);
        }

        if (notification.status !== NotificationStatus.SCHEDULED) {
            throw new BadRequestException('Notification is not scheduled');
        }

        // Cancel the scheduled job (assuming jobId is stored somewhere)
        // For now, we'll just update the status
        notification.status = NotificationStatus.CANCELLED;
        this.notifications.set(notificationId, notification);

        return true;
    }

    async getNotification(notificationId: string): Promise<NotificationEntity> {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            throw new NotFoundException(`Notification ${notificationId} not found`);
        }
        return notification;
    }

    async getUserNotifications(userId: string, limit: number = 50): Promise<NotificationEntity[]> {
        const userNotifications = Array.from(this.notifications.values())
            .filter(notification => notification.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);

        return userNotifications;
    }

    // Spaced repetition reminder scheduling
    async scheduleSpacedRepetitionReminder(
        userId: string,
        topicName: string,
        itemCount: number,
        dueDate: Date
    ): Promise<string> {
        const notification = await this.createNotification({
            userId,
            type: NotificationType.SPACED_REPETITION,
            title: '', // Will be filled by template
            body: '', // Will be filled by template
            templateId: 'spaced_repetition_reminder',
            templateData: { topicName, itemCount: itemCount.toString() },
            scheduledFor: dueDate.toISOString(),
            priority: NotificationPriority.NORMAL,
            tags: ['spaced-repetition', topicName],
        });

        return notification.id;
    }

    // Achievement notification
    async sendAchievementNotification(
        userId: string,
        achievementName: string,
        achievementDescription: string
    ): Promise<NotificationResult> {
        return this.sendNotification({
            userId,
            title: '', // Will be filled by template
            body: '', // Will be filled by template
            data: {
                type: 'achievement',
                achievementName,
                achievementDescription,
            },
            priority: NotificationPriority.HIGH,
        });
    }

    // Streak reminder
    async scheduleStreakReminder(userId: string, streakCount: number, reminderTime: Date): Promise<string> {
        const notification = await this.createNotification({
            userId,
            type: NotificationType.STREAK_REMINDER,
            title: '', // Will be filled by template
            body: '', // Will be filled by template
            templateId: 'streak_reminder',
            templateData: { streakCount: streakCount.toString() },
            scheduledFor: reminderTime.toISOString(),
            priority: NotificationPriority.NORMAL,
            tags: ['streak', 'reminder'],
        });

        return notification.id;
    }

    // Mock test reminder
    async scheduleMockTestReminder(
        userId: string,
        testType: string,
        passRate: number,
        reminderTime: Date
    ): Promise<string> {
        const notification = await this.createNotification({
            userId,
            type: NotificationType.MOCK_TEST_REMINDER,
            title: '', // Will be filled by template
            body: '', // Will be filled by template
            templateId: 'mock_test_reminder',
            templateData: {
                testType,
                passRate: passRate.toString()
            },
            scheduledFor: reminderTime.toISOString(),
            priority: NotificationPriority.NORMAL,
            tags: ['mock-test', 'reminder'],
        });

        return notification.id;
    }

    // Cleanup old notifications (run daily)
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async cleanupOldNotifications(): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep notifications for 30 days

            let cleanedCount = 0;
            for (const [id, notification] of this.notifications.entries()) {
                if (notification.createdAt < cutoffDate) {
                    this.notifications.delete(id);
                    cleanedCount++;
                }
            }

            this.logger.log(`Cleaned up ${cleanedCount} old notifications`);
        } catch (error) {
            this.logger.error('Failed to cleanup old notifications', error);
        }
    }

    // Cleanup inactive device tokens (run weekly)
    @Cron(CronExpression.EVERY_WEEK)
    async cleanupInactiveTokens(): Promise<void> {
        try {
            const deactivatedCount = await this.deviceTokenService.deactivateInactiveTokens(30);
            this.logger.log(`Deactivated ${deactivatedCount} inactive device tokens`);
        } catch (error) {
            this.logger.error('Failed to cleanup inactive tokens', error);
        }
    }

    // Get notification statistics
    async getNotificationStats(userId?: string): Promise<{
        totalNotifications: number;
        sentNotifications: number;
        scheduledNotifications: number;
        failedNotifications: number;
        deliveryRate: number;
    }> {
        try {
            let notifications = Array.from(this.notifications.values());

            if (userId) {
                notifications = notifications.filter(n => n.userId === userId);
            }

            const total = notifications.length;
            const sent = notifications.filter(n => n.status === NotificationStatus.SENT).length;
            const scheduled = notifications.filter(n => n.status === NotificationStatus.SCHEDULED).length;
            const failed = notifications.filter(n => n.status === NotificationStatus.FAILED).length;
            const deliveryRate = total > 0 ? (sent / total) * 100 : 0;

            return {
                totalNotifications: total,
                sentNotifications: sent,
                scheduledNotifications: scheduled,
                failedNotifications: failed,
                deliveryRate: Math.round(deliveryRate * 100) / 100,
            };
        } catch (error) {
            this.logger.error('Failed to get notification stats', error);
            throw error;
        }
    }

    private generateNotificationId(): string {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}