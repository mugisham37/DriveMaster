import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NotificationService } from './services/notification.service';
import { NotificationTemplateService } from './services/template.service';
import { DeviceTokenService } from './services/device-token.service';
import { NotificationSchedulerService } from './services/scheduler.service';
import { FCMProvider } from './providers/fcm.provider';
import { APNSProvider } from './providers/apns.provider';
import { NotificationType, NotificationPriority } from './dto/notification.dto';

describe('NotificationService', () => {
    let service: NotificationService;
    let templateService: NotificationTemplateService;
    let deviceTokenService: DeviceTokenService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                NotificationTemplateService,
                DeviceTokenService,
                NotificationSchedulerService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                FIREBASE_PROJECT_ID: 'test-project',
                                FIREBASE_CLIENT_EMAIL: 'test@test.com',
                                FIREBASE_PRIVATE_KEY: 'test-key',
                                APNS_KEY_ID: 'test-key-id',
                                APNS_TEAM_ID: 'test-team-id',
                                APNS_BUNDLE_ID: 'com.test.app',
                            };
                            return config[key];
                        }),
                    },
                },
                {
                    provide: FCMProvider,
                    useValue: {
                        send: jest.fn().mockResolvedValue({
                            success: true,
                            deliveredCount: 1,
                            failedCount: 0,
                        }),
                        sendBatch: jest.fn(),
                        validateToken: jest.fn().mockResolvedValue(true),
                    },
                },
                {
                    provide: APNSProvider,
                    useValue: {
                        send: jest.fn().mockResolvedValue({
                            success: true,
                            deliveredCount: 1,
                            failedCount: 0,
                        }),
                        sendBatch: jest.fn(),
                        validateToken: jest.fn().mockResolvedValue(true),
                    },
                },
                {
                    provide: SchedulerRegistry,
                    useValue: {
                        addCronJob: jest.fn(),
                        deleteCronJob: jest.fn(),
                        doesExist: jest.fn().mockReturnValue(false),
                    },
                },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
        templateService = module.get<NotificationTemplateService>(NotificationTemplateService);
        deviceTokenService = module.get<DeviceTokenService>(DeviceTokenService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createNotification', () => {
        it('should create a notification successfully', async () => {
            const dto = {
                userId: 'test-user-123',
                type: NotificationType.SPACED_REPETITION,
                title: 'Test Notification',
                body: 'This is a test notification',
                priority: NotificationPriority.NORMAL,
            };

            const notification = await service.createNotification(dto);

            expect(notification).toBeDefined();
            expect(notification.userId).toBe(dto.userId);
            expect(notification.type).toBe(dto.type);
            expect(notification.title).toBe(dto.title);
            expect(notification.body).toBe(dto.body);
            expect(notification.priority).toBe(dto.priority);
        });

        it('should create notification with template', async () => {
            const dto = {
                userId: 'test-user-123',
                type: NotificationType.SPACED_REPETITION,
                title: '', // Will be filled by template
                body: '', // Will be filled by template
                templateId: 'spaced_repetition_reminder',
                templateData: { topicName: 'Traffic Signs', itemCount: '5' },
                priority: NotificationPriority.NORMAL,
            };

            const notification = await service.createNotification(dto);

            expect(notification).toBeDefined();
            expect(notification.title).toContain('Traffic Signs');
            expect(notification.body).toContain('5');
        });
    });

    describe('sendNotification', () => {
        it('should send notification successfully', async () => {
            // Register a device token first
            await deviceTokenService.registerToken(
                'test-user-123',
                'test-token-123',
                'ios'
            );

            const dto = {
                userId: 'test-user-123',
                title: 'Test Notification',
                body: 'This is a test notification',
                priority: NotificationPriority.NORMAL,
            };

            const result = await service.sendNotification(dto);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.deliveredCount).toBeGreaterThan(0);
        });

        it('should handle no device tokens gracefully', async () => {
            const dto = {
                userId: 'user-with-no-tokens',
                title: 'Test Notification',
                body: 'This is a test notification',
                priority: NotificationPriority.NORMAL,
            };

            const result = await service.sendNotification(dto);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.error).toBe('No active device tokens');
        });
    });

    describe('scheduleSpacedRepetitionReminder', () => {
        it('should schedule spaced repetition reminder', async () => {
            const userId = 'test-user-123';
            const topicName = 'Traffic Signs';
            const itemCount = 5;
            const dueDate = new Date('2024-01-15T09:00:00Z');

            const notificationId = await service.scheduleSpacedRepetitionReminder(
                userId,
                topicName,
                itemCount,
                dueDate
            );

            expect(notificationId).toBeDefined();
            expect(typeof notificationId).toBe('string');

            // Verify notification was created
            const notification = await service.getNotification(notificationId);
            expect(notification.type).toBe(NotificationType.SPACED_REPETITION);
            expect(notification.userId).toBe(userId);
        });
    });

    describe('getNotificationStats', () => {
        it('should return notification statistics', async () => {
            const stats = await service.getNotificationStats();

            expect(stats).toBeDefined();
            expect(typeof stats.totalNotifications).toBe('number');
            expect(typeof stats.sentNotifications).toBe('number');
            expect(typeof stats.scheduledNotifications).toBe('number');
            expect(typeof stats.failedNotifications).toBe('number');
            expect(typeof stats.deliveryRate).toBe('number');
        });

        it('should return user-specific statistics', async () => {
            const userId = 'test-user-123';

            // Create a notification for the user
            await service.createNotification({
                userId,
                type: NotificationType.ACHIEVEMENT,
                title: 'Test Achievement',
                body: 'You earned an achievement!',
                priority: NotificationPriority.HIGH,
            });

            const stats = await service.getNotificationStats(userId);

            expect(stats).toBeDefined();
            expect(stats.totalNotifications).toBeGreaterThan(0);
        });
    });
});

describe('NotificationTemplateService', () => {
    let service: NotificationTemplateService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NotificationTemplateService],
        }).compile();

        service = module.get<NotificationTemplateService>(NotificationTemplateService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have default templates', async () => {
        const templates = await service.listTemplates();
        expect(templates.length).toBeGreaterThan(0);
    });

    it('should render template correctly', async () => {
        const templates = await service.listTemplates(NotificationType.SPACED_REPETITION);
        expect(templates.length).toBeGreaterThan(0);

        const template = templates[0];
        const rendered = await service.render(template.id, {
            topicName: 'Traffic Signs',
            itemCount: '5',
        });

        expect(rendered.title).toContain('Traffic Signs');
        expect(rendered.body).toContain('5');
    });
});

describe('DeviceTokenService', () => {
    let service: DeviceTokenService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DeviceTokenService],
        }).compile();

        service = module.get<DeviceTokenService>(DeviceTokenService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should register device token', async () => {
        const userId = 'test-user-123';
        const token = 'test-token-123';
        const platform = 'ios';

        await service.registerToken(userId, token, platform);

        const tokens = await service.getActiveTokens(userId);
        expect(tokens).toContain(token);
    });

    it('should remove device token', async () => {
        const userId = 'test-user-123';
        const token = 'test-token-123';
        const platform = 'ios';

        await service.registerToken(userId, token, platform);
        await service.removeToken(userId, token);

        const tokens = await service.getActiveTokens(userId);
        expect(tokens).not.toContain(token);
    });

    it('should get token statistics', async () => {
        const stats = await service.getTokenStats();

        expect(stats).toBeDefined();
        expect(typeof stats.totalUsers).toBe('number');
        expect(typeof stats.totalTokens).toBe('number');
        expect(typeof stats.activeTokens).toBe('number');
        expect(typeof stats.inactiveTokens).toBe('number');
        expect(typeof stats.platformBreakdown).toBe('object');
    });
});