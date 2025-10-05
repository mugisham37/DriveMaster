import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    INotificationAnalytics,
    NotificationResult,
    DeliveryStats,
    EngagementStats,
    DateRange
} from '../interfaces/notification.interface';
import { NotificationType } from '../dto/notification.dto';
import { NotificationEntity, NotificationStatus } from '../entities/notification.entity';

interface NotificationEvent {
    notificationId: string;
    userId: string;
    type: NotificationType;
    event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
    timestamp: Date;
    metadata?: Record<string, any>;
}

interface ABTestVariant {
    id: string;
    name: string;
    description: string;
    config: {
        titleTemplate?: string;
        bodyTemplate?: string;
        sendTime?: string; // HH:mm format
        priority?: string;
        frequency?: string;
    };
    isActive: boolean;
    trafficPercentage: number; // 0-100
}

export interface ABTestResult {
    variantId: string;
    totalSent: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number; // Based on user action after notification
}

@Injectable()
export class NotificationAnalyticsService implements INotificationAnalytics {
    private readonly logger = new Logger(NotificationAnalyticsService.name);
    private events: NotificationEvent[] = [];
    private abTestVariants: Map<string, ABTestVariant> = new Map();
    private abTestAssignments: Map<string, string> = new Map(); // userId -> variantId

    constructor() {
        this.initializeDefaultABTests();
    }

    private initializeDefaultABTests() {
        const defaultVariants: ABTestVariant[] = [
            {
                id: 'spaced_rep_urgent',
                name: 'Urgent Spaced Repetition',
                description: 'High priority spaced repetition reminders',
                config: {
                    titleTemplate: '⚡ Don\'t miss your review!',
                    bodyTemplate: 'You have {{itemCount}} items ready for review. Act now to maintain your progress!',
                    priority: 'HIGH',
                    sendTime: '09:00',
                },
                isActive: true,
                trafficPercentage: 50,
            },
            {
                id: 'spaced_rep_gentle',
                name: 'Gentle Spaced Repetition',
                description: 'Friendly spaced repetition reminders',
                config: {
                    titleTemplate: 'Time to review {{topicName}} 📚',
                    bodyTemplate: 'Your {{itemCount}} items are ready for review. Take your time and keep learning!',
                    priority: 'NORMAL',
                    sendTime: '10:00',
                },
                isActive: true,
                trafficPercentage: 50,
            },
        ];

        defaultVariants.forEach(variant => {
            this.abTestVariants.set(variant.id, variant);
        });

        this.logger.log(`Initialized ${defaultVariants.length} A/B test variants`);
    }

    async trackDelivery(notificationId: string, result: NotificationResult): Promise<void> {
        try {
            // Track delivery event
            this.events.push({
                notificationId,
                userId: '', // Would be populated from notification
                type: NotificationType.SPACED_REPETITION, // Would be from notification
                event: result.success ? 'delivered' : 'failed',
                timestamp: new Date(),
                metadata: {
                    deliveredCount: result.deliveredCount,
                    failedCount: result.failedCount,
                    error: result.error,
                },
            });

            this.logger.debug(`Tracked delivery for notification ${notificationId}: ${result.success ? 'success' : 'failed'}`);
        } catch (error) {
            this.logger.error('Failed to track delivery', error);
        }
    }

    async trackOpen(notificationId: string, userId: string): Promise<void> {
        try {
            this.events.push({
                notificationId,
                userId,
                type: NotificationType.SPACED_REPETITION, // Would be from notification
                event: 'opened',
                timestamp: new Date(),
            });

            this.logger.debug(`Tracked open for notification ${notificationId} by user ${userId}`);
        } catch (error) {
            this.logger.error('Failed to track open', error);
        }
    }

    async trackClick(notificationId: string, userId: string, action?: string): Promise<void> {
        try {
            this.events.push({
                notificationId,
                userId,
                type: NotificationType.SPACED_REPETITION, // Would be from notification
                event: 'clicked',
                timestamp: new Date(),
                metadata: { action },
            });

            this.logger.debug(`Tracked click for notification ${notificationId} by user ${userId}${action ? ` (action: ${action})` : ''}`);
        } catch (error) {
            this.logger.error('Failed to track click', error);
        }
    }

    async getDeliveryStats(
        userId?: string,
        type?: NotificationType,
        dateRange?: DateRange
    ): Promise<DeliveryStats> {
        try {
            let filteredEvents = this.events.filter(event =>
                ['delivered', 'failed'].includes(event.event)
            );

            // Apply filters
            if (userId) {
                filteredEvents = filteredEvents.filter(event => event.userId === userId);
            }
            if (type) {
                filteredEvents = filteredEvents.filter(event => event.type === type);
            }
            if (dateRange) {
                filteredEvents = filteredEvents.filter(event =>
                    event.timestamp >= dateRange.startDate && event.timestamp <= dateRange.endDate
                );
            }

            const totalSent = filteredEvents.length;
            const totalDelivered = filteredEvents.filter(event => event.event === 'delivered').length;
            const totalFailed = filteredEvents.filter(event => event.event === 'failed').length;
            const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

            // Analyze failure reasons
            const failureReasons: Record<string, number> = {};
            filteredEvents
                .filter(event => event.event === 'failed' && event.metadata?.error)
                .forEach(event => {
                    const error = event.metadata!.error as string;
                    failureReasons[error] = (failureReasons[error] || 0) + 1;
                });

            return {
                totalSent,
                totalDelivered,
                totalFailed,
                deliveryRate: Math.round(deliveryRate * 100) / 100,
                failureReasons,
            };
        } catch (error) {
            this.logger.error('Failed to get delivery stats', error);
            throw error;
        }
    }

    async getEngagementStats(
        userId?: string,
        type?: NotificationType,
        dateRange?: DateRange
    ): Promise<EngagementStats> {
        try {
            let deliveredEvents = this.events.filter(event => event.event === 'delivered');
            let openEvents = this.events.filter(event => event.event === 'opened');
            let clickEvents = this.events.filter(event => event.event === 'clicked');

            // Apply filters to all event types
            const applyFilters = (events: NotificationEvent[]) => {
                let filtered = events;
                if (userId) {
                    filtered = filtered.filter(event => event.userId === userId);
                }
                if (type) {
                    filtered = filtered.filter(event => event.type === type);
                }
                if (dateRange) {
                    filtered = filtered.filter(event =>
                        event.timestamp >= dateRange.startDate && event.timestamp <= dateRange.endDate
                    );
                }
                return filtered;
            };

            deliveredEvents = applyFilters(deliveredEvents);
            openEvents = applyFilters(openEvents);
            clickEvents = applyFilters(clickEvents);

            const totalDelivered = deliveredEvents.length;
            const totalOpened = openEvents.length;
            const totalClicked = clickEvents.length;

            const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
            const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

            // Calculate average time to open/click
            const calculateAvgTime = (events: NotificationEvent[], baseEvents: NotificationEvent[]) => {
                const times: number[] = [];
                events.forEach(event => {
                    const baseEvent = baseEvents.find(base => base.notificationId === event.notificationId);
                    if (baseEvent) {
                        times.push(event.timestamp.getTime() - baseEvent.timestamp.getTime());
                    }
                });
                return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : undefined;
            };

            const avgTimeToOpen = calculateAvgTime(openEvents, deliveredEvents);
            const avgTimeToClick = calculateAvgTime(clickEvents, openEvents);

            return {
                totalOpened,
                totalClicked,
                openRate: Math.round(openRate * 100) / 100,
                clickRate: Math.round(clickRate * 100) / 100,
                avgTimeToOpen: avgTimeToOpen ? Math.round(avgTimeToOpen / 1000) : undefined, // Convert to seconds
                avgTimeToClick: avgTimeToClick ? Math.round(avgTimeToClick / 1000) : undefined,
            };
        } catch (error) {
            this.logger.error('Failed to get engagement stats', error);
            throw error;
        }
    }

    // A/B Testing functionality
    async assignUserToVariant(userId: string, testType: NotificationType): Promise<string> {
        try {
            // Check if user already assigned
            const existingAssignment = this.abTestAssignments.get(userId);
            if (existingAssignment) {
                return existingAssignment;
            }

            // Get active variants for this test type
            const activeVariants = Array.from(this.abTestVariants.values())
                .filter(variant => variant.isActive);

            if (activeVariants.length === 0) {
                throw new Error('No active A/B test variants found');
            }

            // Weighted random selection based on traffic percentage
            const random = Math.random() * 100;
            let cumulativePercentage = 0;

            for (const variant of activeVariants) {
                cumulativePercentage += variant.trafficPercentage;
                if (random <= cumulativePercentage) {
                    this.abTestAssignments.set(userId, variant.id);
                    this.logger.debug(`Assigned user ${userId} to variant ${variant.id}`);
                    return variant.id;
                }
            }

            // Fallback to first variant
            const fallbackVariant = activeVariants[0];
            this.abTestAssignments.set(userId, fallbackVariant.id);
            return fallbackVariant.id;
        } catch (error) {
            this.logger.error('Failed to assign user to variant', error);
            throw error;
        }
    }

    async getVariantConfig(variantId: string): Promise<ABTestVariant | null> {
        return this.abTestVariants.get(variantId) || null;
    }

    async getABTestResults(): Promise<ABTestResult[]> {
        try {
            const results: ABTestResult[] = [];

            for (const variant of this.abTestVariants.values()) {
                // Get users assigned to this variant
                const variantUsers = Array.from(this.abTestAssignments.entries())
                    .filter(([_, variantId]) => variantId === variant.id)
                    .map(([userId, _]) => userId);

                if (variantUsers.length === 0) {
                    continue;
                }

                // Calculate metrics for this variant
                const variantEvents = this.events.filter(event =>
                    variantUsers.includes(event.userId)
                );

                const sentEvents = variantEvents.filter(event => event.event === 'delivered');
                const openEvents = variantEvents.filter(event => event.event === 'opened');
                const clickEvents = variantEvents.filter(event => event.event === 'clicked');

                const totalSent = sentEvents.length;
                const deliveryRate = totalSent > 0 ? (sentEvents.length / totalSent) * 100 : 0;
                const openRate = totalSent > 0 ? (openEvents.length / totalSent) * 100 : 0;
                const clickRate = openEvents.length > 0 ? (clickEvents.length / openEvents.length) * 100 : 0;

                // Conversion rate would be calculated based on user actions after notification
                // For now, we'll use click rate as a proxy
                const conversionRate = clickRate;

                results.push({
                    variantId: variant.id,
                    totalSent,
                    deliveryRate: Math.round(deliveryRate * 100) / 100,
                    openRate: Math.round(openRate * 100) / 100,
                    clickRate: Math.round(clickRate * 100) / 100,
                    conversionRate: Math.round(conversionRate * 100) / 100,
                });
            }

            return results;
        } catch (error) {
            this.logger.error('Failed to get A/B test results', error);
            throw error;
        }
    }

    // Notification frequency optimization
    async getOptimalSendTime(userId: string, type: NotificationType): Promise<string> {
        try {
            // Analyze user's historical engagement by hour
            const userEvents = this.events.filter(event =>
                event.userId === userId &&
                event.type === type &&
                event.event === 'opened'
            );

            if (userEvents.length < 5) {
                // Not enough data, return default time based on type
                const defaultTimes = {
                    [NotificationType.SPACED_REPETITION]: '09:00',
                    [NotificationType.STREAK_REMINDER]: '19:00',
                    [NotificationType.MOCK_TEST_REMINDER]: '10:00',
                    [NotificationType.ACHIEVEMENT]: '12:00',
                    [NotificationType.PLACEMENT_COMPLETE]: '10:00',
                    [NotificationType.SYSTEM_ANNOUNCEMENT]: '12:00',
                };
                return defaultTimes[type] || '10:00';
            }

            // Calculate engagement rate by hour
            const hourlyEngagement: Record<number, { sent: number; opened: number }> = {};

            userEvents.forEach(event => {
                const hour = event.timestamp.getHours();
                if (!hourlyEngagement[hour]) {
                    hourlyEngagement[hour] = { sent: 0, opened: 0 };
                }
                hourlyEngagement[hour].opened++;
            });

            // Find hour with highest engagement rate
            let bestHour = 10; // Default
            let bestRate = 0;

            Object.entries(hourlyEngagement).forEach(([hour, stats]) => {
                const rate = stats.opened / (stats.sent || 1);
                if (rate > bestRate) {
                    bestRate = rate;
                    bestHour = parseInt(hour);
                }
            });

            return `${bestHour.toString().padStart(2, '0')}:00`;
        } catch (error) {
            this.logger.error('Failed to get optimal send time', error);
            return '10:00'; // Default fallback
        }
    }

    // Cleanup old events (run daily)
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async cleanupOldEvents(): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep events for 90 days

            const initialCount = this.events.length;
            this.events = this.events.filter(event => event.timestamp >= cutoffDate);
            const cleanedCount = initialCount - this.events.length;

            this.logger.log(`Cleaned up ${cleanedCount} old analytics events`);
        } catch (error) {
            this.logger.error('Failed to cleanup old events', error);
        }
    }

    // Generate analytics report
    async generateReport(dateRange: DateRange): Promise<{
        deliveryStats: DeliveryStats;
        engagementStats: EngagementStats;
        abTestResults: ABTestResult[];
        topPerformingVariants: string[];
        recommendations: string[];
    }> {
        try {
            const deliveryStats = await this.getDeliveryStats(undefined, undefined, dateRange);
            const engagementStats = await this.getEngagementStats(undefined, undefined, dateRange);
            const abTestResults = await this.getABTestResults();

            // Find top performing variants
            const topPerformingVariants = abTestResults
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 3)
                .map(result => result.variantId);

            // Generate recommendations
            const recommendations: string[] = [];

            if (deliveryStats.deliveryRate < 90) {
                recommendations.push('Consider reviewing device token management - delivery rate is below 90%');
            }

            if (engagementStats.openRate < 20) {
                recommendations.push('Open rate is low - consider A/B testing different notification titles');
            }

            if (engagementStats.clickRate < 10) {
                recommendations.push('Click rate is low - consider improving notification content and call-to-action');
            }

            return {
                deliveryStats,
                engagementStats,
                abTestResults,
                topPerformingVariants,
                recommendations,
            };
        } catch (error) {
            this.logger.error('Failed to generate analytics report', error);
            throw error;
        }
    }
}