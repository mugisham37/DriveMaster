import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as apn from 'node-apn';
import { INotificationProvider, NotificationPayload, NotificationResult } from '../interfaces/notification.interface';
import { NotificationPriority } from '../dto/notification.dto';

@Injectable()
export class APNSProvider implements INotificationProvider {
    private readonly logger = new Logger(APNSProvider.name);
    private provider: apn.Provider;

    constructor(private configService: ConfigService) {
        this.initializeAPNS();
    }

    private initializeAPNS() {
        try {
            const options: apn.ProviderOptions = {
                token: {
                    key: this.configService.get<string>('APNS_KEY_PATH') || this.configService.get<string>('APNS_KEY'),
                    keyId: this.configService.get<string>('APNS_KEY_ID'),
                    teamId: this.configService.get<string>('APNS_TEAM_ID'),
                },
                production: this.configService.get<string>('NODE_ENV') === 'production',
            };

            // If using certificate instead of token
            const certPath = this.configService.get<string>('APNS_CERT_PATH');
            const keyPath = this.configService.get<string>('APNS_KEY_PATH');

            if (certPath && keyPath) {
                delete options.token;
                options.cert = certPath;
                options.key = keyPath;
                options.passphrase = this.configService.get<string>('APNS_PASSPHRASE');
            }

            this.provider = new apn.Provider(options);

            // Handle provider events
            this.provider.on('connected', () => {
                this.logger.log('APNS Provider connected');
            });

            this.provider.on('disconnected', () => {
                this.logger.warn('APNS Provider disconnected');
            });

            this.provider.on('socketError', (error) => {
                this.logger.error('APNS Socket error', error);
            });

            this.provider.on('transmissionError', (errorCode, notification, device) => {
                this.logger.error(`APNS Transmission error ${errorCode} for device ${device}`, notification);
            });

            this.logger.log('APNS Provider initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize APNS Provider', error);
            throw error;
        }
    }

    async send(notification: NotificationPayload): Promise<NotificationResult> {
        try {
            const apnNotification = this.buildNotification(notification);
            const result = await this.provider.send(apnNotification, notification.deviceTokens);

            const failedTokens: string[] = [];
            let deliveredCount = 0;

            result.failed.forEach(failure => {
                failedTokens.push(failure.device);
                this.logger.warn(`APNS delivery failed for device ${failure.device}`, failure.error);
            });

            deliveredCount = result.sent.length;

            return {
                success: deliveredCount > 0,
                deliveredCount,
                failedCount: failedTokens.length,
                failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
            };
        } catch (error) {
            this.logger.error('Failed to send APNS notification', error);
            return {
                success: false,
                error: error.message,
                deliveredCount: 0,
                failedCount: notification.deviceTokens.length,
                failedTokens: notification.deviceTokens,
            };
        }
    }

    async sendBatch(notifications: NotificationPayload[]): Promise<NotificationResult[]> {
        const results: NotificationResult[] = [];

        // Process notifications in parallel with concurrency limit
        const concurrencyLimit = 10;
        for (let i = 0; i < notifications.length; i += concurrencyLimit) {
            const batch = notifications.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(
                batch.map(notification => this.send(notification))
            );
            results.push(...batchResults);
        }

        return results;
    }

    async validateToken(token: string): Promise<boolean> {
        try {
            // Create a test notification
            const testNotification = new apn.Notification();
            testNotification.alert = 'Test';
            testNotification.topic = this.configService.get<string>('APNS_BUNDLE_ID');

            // Send with dry-run (this is a simplified validation)
            // In production, you might want to use a more sophisticated validation
            const result = await this.provider.send(testNotification, [token]);

            // Check if the token was in the failed list
            const failed = result.failed.find(f => f.device === token);
            return !failed;
        } catch (error) {
            this.logger.warn(`Invalid APNS token: ${token}`, error.message);
            return false;
        }
    }

    private buildNotification(notification: NotificationPayload): apn.Notification {
        const apnNotification = new apn.Notification();

        // Basic notification properties
        apnNotification.alert = {
            title: notification.title,
            body: notification.body,
        };

        // Set badge if provided
        if (notification.badge !== undefined) {
            apnNotification.badge = notification.badge;
        }

        // Set sound
        apnNotification.sound = notification.sound || 'default';

        // Set priority
        apnNotification.priority = this.mapPriority(notification.priority);

        // Set content available for silent notifications
        if (notification.silent) {
            apnNotification.contentAvailable = true;
            apnNotification.alert = undefined; // Remove alert for silent notifications
        }

        // Enable mutable content for rich notifications
        apnNotification.mutableContent = true;

        // Add custom data
        if (notification.data) {
            apnNotification.payload = {
                ...apnNotification.payload,
                ...notification.data,
            };
        }

        // Set topic (bundle ID)
        apnNotification.topic = this.configService.get<string>('APNS_BUNDLE_ID');

        // Set expiry (24 hours from now)
        apnNotification.expiry = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

        // Add click action if provided
        if (notification.clickAction) {
            apnNotification.payload.aps.category = notification.clickAction;
        }

        // Add image URL for rich notifications
        if (notification.imageUrl) {
            apnNotification.payload = {
                ...apnNotification.payload,
                'media-url': notification.imageUrl,
            };
        }

        return apnNotification;
    }

    private mapPriority(priority: NotificationPriority): number {
        switch (priority) {
            case NotificationPriority.HIGH:
            case NotificationPriority.URGENT:
                return 10; // High priority
            case NotificationPriority.LOW:
                return 1;  // Low priority
            default:
                return 5;  // Normal priority
        }
    }

    async shutdown(): Promise<void> {
        if (this.provider) {
            this.provider.shutdown();
            this.logger.log('APNS Provider shutdown');
        }
    }
}