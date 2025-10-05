import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { INotificationScheduler, ScheduledNotification } from '../interfaces/notification.interface';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationSchedulerService implements INotificationScheduler {
    private readonly logger = new Logger(NotificationSchedulerService.name);
    private scheduledNotifications: Map<string, ScheduledNotification> = new Map();

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private notificationService: NotificationService,
    ) {}

    async schedule(notification: ScheduledNotification): Promise<string> {
        try {
            const jobId = this.generateJobId();
            const scheduledNotification = {
                ...notification,
                id: jobId,
            };

            // Store the notification
            this.scheduledNotifications.set(jobId, scheduledNotification);

            // Create cron job
            const cronExpression = this.dateToCron(notification.scheduledFor);
            const job = new CronJob(cronExpression, async () => {
                await this.executeScheduledNotification(jobId);
            });

            // Register the job
            this.schedulerRegistry.addCronJob(jobId, job);
            job.start();

            this.logger.log(`Scheduled notification ${jobId} for ${notification.scheduledFor.toISOString()}`);
            return jobId;
        } catch (error) {
            this.logger.error('Failed to schedule notification', error);
            throw error;
        }
    }

    async cancel(jobId: string): Promise<boolean> {
        try {
            // Remove from scheduler registry
            if (this.schedulerRegistry.doesExist('cron', jobId)) {
                this.schedulerRegistry.deleteCronJob(jobId);
            }

            // Remove from our storage
            const removed = this.scheduledNotifications.delete(jobId);
            
            if (removed) {
                this.logger.log(`Cancelled scheduled notification ${jobId}`);
            }
            
            return removed;
        } catch (error) {
            this.logger.error(`Failed to cancel scheduled notification ${jobId}`, error);
            return false;
        }
    }

    async reschedule(jobId: string, newTime: Date): Promise<boolean> {
        try {
            const notification = this.scheduledNotifications.get(jobId);
            if (!notification) {
                return false;
            }

            // Cancel existing job
            await this.cancel(jobId);

            // Schedule with new time
            const updatedNotification = {
                ...notification,
                scheduledFor: newTime,
            };

            const newJobId = await this.schedule(updatedNotification);
            
            this.logger.log(`Rescheduled notification ${jobId} to ${newJobId} for ${newTime.toISOString()}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to reschedule notification ${jobId}`, error);
            return false;
        }
    }

    async getScheduledNotifications(userId: string): Promise<ScheduledNotification[]> {
        try {
            const userNotifications: ScheduledNotification[] = [];
            
            for (const notification of this.scheduledNotifications.values()) {
                if (notification.userId === userId) {
                    userNotifications.push(notification);
                }
            }
            
            // Sort by scheduled time
            userNotifications.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
            
            return userNotifications;
        } catch (error) {
            this.logger.error(`Failed to get scheduled notifications for user ${userId}`, error);