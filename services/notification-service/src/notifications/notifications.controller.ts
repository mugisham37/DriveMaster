import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpStatus,
    Logger,
    BadRequestException,
    NotFoundException
} from '@nestjs/common';
import {
    CreateNotificationDto,
    SendNotificationDto,
    ScheduleNotificationDto,
    NotificationTemplateDto
} from './dto/notification.dto';
import { NotificationService } from './services/notification.service';
import { NotificationTemplateService } from './services/template.service';
import { DeviceTokenService } from './services/device-token.service';
import { NotificationSchedulerService } from './services/scheduler.service';
import { NotificationAnalyticsService, ABTestResult } from './services/analytics.service';

@Controller('notifications')
export class NotificationsController {
    private readonly logger = new Logger(NotificationsController.name);

    constructor(
        private notificationService: NotificationService,
        private templateService: NotificationTemplateService,
        private deviceTokenService: DeviceTokenService,
        private schedulerService: NotificationSchedulerService,
        private analyticsService: NotificationAnalyticsService,
    ) { }

    // Notification CRUD operations
    @Post()
    async createNotification(@Body() dto: CreateNotificationDto) {
        try {
            const notification = await this.notificationService.createNotification(dto);
            return {
                status: 'success',
                data: notification,
            };
        } catch (error) {
            this.logger.error('Failed to create notification', error);
            throw error;
        }
    }

    @Post('send')
    async sendNotification(@Body() dto: SendNotificationDto) {
        try {
            const result = await this.notificationService.sendNotification(dto);
            return {
                status: 'success',
                data: result,
            };
        } catch (error) {
            this.logger.error('Failed to send notification', error);
            throw error;
        }
    }

    @Post('schedule')
    async scheduleNotification(@Body() dto: ScheduleNotificationDto) {
        try {
            const notification = await this.notificationService.createNotification(dto);
            return {
                status: 'success',
                data: notification,
            };
        } catch (error) {
            this.logger.error('Failed to schedule notification', error);
            throw error;
        }
    }

    @Get(':id')
    async getNotification(@Param('id') id: string) {
        try {
            const notification = await this.notificationService.getNotification(id);
            return {
                status: 'success',
                data: notification,
            };
        } catch (error) {
            this.logger.error(`Failed to get notification ${id}`, error);
            throw error;
        }
    }

    @Get('user/:userId')
    async getUserNotifications(
        @Param('userId') userId: string,
        @Query('limit') limit?: string
    ) {
        try {
            const limitNum = limit ? parseInt(limit, 10) : 50;
            const notifications = await this.notificationService.getUserNotifications(userId, limitNum);
            return {
                status: 'success',
                data: notifications,
            };
        } catch (error) {
            this.logger.error(`Failed to get notifications for user ${userId}`, error);
            throw error;
        }
    }

    @Delete(':id')
    async cancelNotification(@Param('id') id: string) {
        try {
            const result = await this.notificationService.cancelScheduledNotification(id);
            return {
                status: 'success',
                data: { cancelled: result },
            };
        } catch (error) {
            this.logger.error(`Failed to cancel notification ${id}`, error);
            throw error;
        }
    }

    // Device token management
    @Post('tokens/register')
    async registerDeviceToken(@Body() body: {
        userId: string;
        token: string;
        platform: 'ios' | 'android' | 'web';
        metadata?: Record<string, any>;
    }) {
        try {
            await this.deviceTokenService.registerToken(
                body.userId,
                body.token,
                body.platform,
                body.metadata
            );
            return {
                status: 'success',
                message: 'Device token registered successfully',
            };
        } catch (error) {
            this.logger.error('Failed to register device token', error);
            throw error;
        }
    }

    @Delete('tokens/:userId/:token')
    async removeDeviceToken(
        @Param('userId') userId: string,
        @Param('token') token: string
    ) {
        try {
            await this.deviceTokenService.removeToken(userId, token);
            return {
                status: 'success',
                message: 'Device token removed successfully',
            };
        } catch (error) {
            this.logger.error('Failed to remove device token', error);
            throw error;
        }
    }

    @Get('tokens/:userId')
    async getUserTokens(
        @Param('userId') userId: string,
        @Query('platform') platform?: 'ios' | 'android' | 'web'
    ) {
        try {
            const tokens = await this.deviceTokenService.getUserTokens(userId, platform);
            return {
                status: 'success',
                data: tokens,
            };
        } catch (error) {
            this.logger.error(`Failed to get tokens for user ${userId}`, error);
            throw error;
        }
    }

    // Template management
    @Post('templates')
    async createTemplate(@Body() dto: NotificationTemplateDto) {
        try {
            const template = await this.templateService.createTemplate({
                name: dto.name,
                type: dto.type,
                titleTemplate: dto.titleTemplate,
                bodyTemplate: dto.bodyTemplate,
                defaultData: dto.defaultData,
                requiredVariables: dto.requiredVariables,
            });
            return {
                status: 'success',
                data: template,
            };
        } catch (error) {
            this.logger.error('Failed to create template', error);
            throw error;
        }
    }

    @Get('templates')
    async listTemplates(@Query('type') type?: string) {
        try {
            const templates = await this.templateService.listTemplates(type as any);
            return {
                status: 'success',
                data: templates,
            };
        } catch (error) {
            this.logger.error('Failed to list templates', error);
            throw error;
        }
    }

    @Get('templates/:id')
    async getTemplate(@Param('id') id: string) {
        try {
            const template = await this.templateService.getTemplate(id);
            if (!template) {
                throw new NotFoundException(`Template ${id} not found`);
            }
            return {
                status: 'success',
                data: template,
            };
        } catch (error) {
            this.logger.error(`Failed to get template ${id}`, error);
            throw error;
        }
    }

    @Post('templates/:id/render')
    async renderTemplate(
        @Param('id') id: string,
        @Body() data: Record<string, any>
    ) {
        try {
            const rendered = await this.templateService.render(id, data);
            return {
                status: 'success',
                data: rendered,
            };
        } catch (error) {
            this.logger.error(`Failed to render template ${id}`, error);
            throw error;
        }
    }

    // Specialized notification endpoints
    @Post('spaced-repetition')
    async scheduleSpacedRepetitionReminder(@Body() body: {
        userId: string;
        topicName: string;
        itemCount: number;
        dueDate: string;
    }) {
        try {
            const notificationId = await this.notificationService.scheduleSpacedRepetitionReminder(
                body.userId,
                body.topicName,
                body.itemCount,
                new Date(body.dueDate)
            );
            return {
                status: 'success',
                data: { notificationId },
            };
        } catch (error) {
            this.logger.error('Failed to schedule spaced repetition reminder', error);
            throw error;
        }
    }

    @Post('achievement')
    async sendAchievementNotification(@Body() body: {
        userId: string;
        achievementName: string;
        achievementDescription: string;
    }) {
        try {
            const result = await this.notificationService.sendAchievementNotification(
                body.userId,
                body.achievementName,
                body.achievementDescription
            );
            return {
                status: 'success',
                data: result,
            };
        } catch (error) {
            this.logger.error('Failed to send achievement notification', error);
            throw error;
        }
    }

    @Post('streak-reminder')
    async scheduleStreakReminder(@Body() body: {
        userId: string;
        streakCount: number;
        reminderTime: string;
    }) {
        try {
            const notificationId = await this.notificationService.scheduleStreakReminder(
                body.userId,
                body.streakCount,
                new Date(body.reminderTime)
            );
            return {
                status: 'success',
                data: { notificationId },
            };
        } catch (error) {
            this.logger.error('Failed to schedule streak reminder', error);
            throw error;
        }
    }

    @Post('mock-test-reminder')
    async scheduleMockTestReminder(@Body() body: {
        userId: string;
        testType: string;
        passRate: number;
        reminderTime: string;
    }) {
        try {
            const notificationId = await this.notificationService.scheduleMockTestReminder(
                body.userId,
                body.testType,
                body.passRate,
                new Date(body.reminderTime)
            );
            return {
                status: 'success',
                data: { notificationId },
            };
        } catch (error) {
            this.logger.error('Failed to schedule mock test reminder', error);
            throw error;
        }
    }

    // Analytics and stats
    @Get('stats/overview')
    async getNotificationStats(@Query('userId') userId?: string) {
        try {
            const stats = await this.notificationService.getNotificationStats(userId);
            return {
                status: 'success',
                data: stats,
            };
        } catch (error) {
            this.logger.error('Failed to get notification stats', error);
            throw error;
        }
    }

    @Get('stats/tokens')
    async getTokenStats() {
        try {
            const stats = await this.deviceTokenService.getTokenStats();
            return {
                status: 'success',
                data: stats,
            };
        } catch (error) {
            this.logger.error('Failed to get token stats', error);
            throw error;
        }
    }

    // Analytics endpoints
    @Get('analytics/delivery')
    async getDeliveryStats(
        @Query('userId') userId?: string,
        @Query('type') type?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        try {
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            } : undefined;

            const stats = await this.analyticsService.getDeliveryStats(
                userId,
                type as any,
                dateRange
            );

            return {
                status: 'success',
                data: stats,
            };
        } catch (error) {
            this.logger.error('Failed to get delivery stats', error);
            throw error;
        }
    }

    @Get('analytics/engagement')
    async getEngagementStats(
        @Query('userId') userId?: string,
        @Query('type') type?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        try {
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            } : undefined;

            const stats = await this.analyticsService.getEngagementStats(
                userId,
                type as any,
                dateRange
            );

            return {
                status: 'success',
                data: stats,
            };
        } catch (error) {
            this.logger.error('Failed to get engagement stats', error);
            throw error;
        }
    }

    @Get('analytics/ab-test-results')
    async getABTestResults() {
        try {
            const results = await this.analyticsService.getABTestResults();
            return {
                status: 'success',
                data: results,
            };
        } catch (error) {
            this.logger.error('Failed to get A/B test results', error);
            throw error;
        }
    }

    @Post('analytics/track-open')
    async trackOpen(@Body() body: { notificationId: string; userId: string }) {
        try {
            await this.analyticsService.trackOpen(body.notificationId, body.userId);
            return {
                status: 'success',
                message: 'Open event tracked',
            };
        } catch (error) {
            this.logger.error('Failed to track open', error);
            throw error;
        }
    }

    @Post('analytics/track-click')
    async trackClick(@Body() body: {
        notificationId: string;
        userId: string;
        action?: string
    }) {
        try {
            await this.analyticsService.trackClick(
                body.notificationId,
                body.userId,
                body.action
            );
            return {
                status: 'success',
                message: 'Click event tracked',
            };
        } catch (error) {
            this.logger.error('Failed to track click', error);
            throw error;
        }
    }

    @Get('analytics/report')
    async generateAnalyticsReport(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        try {
            if (!startDate || !endDate) {
                throw new BadRequestException('startDate and endDate are required');
            }

            const dateRange = {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            };

            const report = await this.analyticsService.generateReport(dateRange);
            return {
                status: 'success',
                data: report,
            };
        } catch (error) {
            this.logger.error('Failed to generate analytics report', error);
            throw error;
        }
    }

    // Health check
    @Get('health')
    async healthCheck() {
        return {
            status: 'ok',
            service: 'notification-service',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        };
    }
}