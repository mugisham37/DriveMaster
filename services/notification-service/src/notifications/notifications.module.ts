import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { NotificationsController } from './notifications.controller';

// Services
import { NotificationService } from './services/notification.service';
import { NotificationTemplateService } from './services/template.service';
import { DeviceTokenService } from './services/device-token.service';
import { NotificationSchedulerService } from './services/scheduler.service';
import { KafkaConsumerService } from './services/kafka-consumer.service';
import { NotificationAnalyticsService } from './services/analytics.service';

// Providers
import { FCMProvider } from './providers/fcm.provider';
import { APNSProvider } from './providers/apns.provider';

@Module({
    imports: [
        ConfigModule,
        ScheduleModule,
    ],
    controllers: [
        NotificationsController,
    ],
    providers: [
        // Core services
        NotificationService,
        NotificationTemplateService,
        DeviceTokenService,
        NotificationSchedulerService,
        KafkaConsumerService,
        NotificationAnalyticsService,

        // Push notification providers
        FCMProvider,
        APNSProvider,
    ],
    exports: [
        NotificationService,
        NotificationTemplateService,
        DeviceTokenService,
        NotificationSchedulerService,
        KafkaConsumerService,
        NotificationAnalyticsService,
        FCMProvider,
        APNSProvider,
    ],
})
export class NotificationsModule { }