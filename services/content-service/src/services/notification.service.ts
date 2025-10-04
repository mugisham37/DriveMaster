import { Injectable, Logger } from '@nestjs/common';
import { Item, ItemStatus } from '../content/entities/item.entity';
import { WorkflowAction } from '../content/entities/workflow-history.entity';

export interface NotificationPayload {
    type: 'workflow_notification';
    itemId: string;
    itemSlug: string;
    action: WorkflowAction;
    previousStatus: ItemStatus;
    newStatus: ItemStatus;
    performedBy: string;
    assignedTo?: string;
    message?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    async sendWorkflowNotification(payload: NotificationPayload): Promise<void> {
        try {
            // In production, this would integrate with the notification service
            // For now, we'll log the notification
            this.logger.log(`Workflow notification: ${JSON.stringify(payload)}`);

            // TODO: Integrate with actual notification service
            // - Send email notifications
            // - Send push notifications
            // - Create in-app notifications
            // - Publish to Kafka for async processing

            await this.mockNotificationDelivery(payload);
        } catch (error) {
            this.logger.error(`Failed to send workflow notification: ${error.message}`, error.stack);
            // Don't throw error to avoid breaking the workflow
        }
    }

    async notifyReviewAssignment(
        item: Item,
        reviewerId: string,
        assignedBy: string,
        message?: string
    ): Promise<void> {
        const payload: NotificationPayload = {
            type: 'workflow_notification',
            itemId: item.id,
            itemSlug: item.slug,
            action: WorkflowAction.ASSIGNED_REVIEWER,
            previousStatus: item.status,
            newStatus: item.status,
            performedBy: assignedBy,
            assignedTo: reviewerId,
            message,
            metadata: {
                itemTitle: item.content.text.substring(0, 100),
                estimatedTime: item.estimatedTime,
                topics: item.topics,
            },
        };

        await this.sendWorkflowNotification(payload);
    }

    async notifyStatusChange(
        item: Item,
        action: WorkflowAction,
        previousStatus: ItemStatus,
        performedBy: string,
        message?: string
    ): Promise<void> {
        const payload: NotificationPayload = {
            type: 'workflow_notification',
            itemId: item.id,
            itemSlug: item.slug,
            action,
            previousStatus,
            newStatus: item.status,
            performedBy,
            message,
            metadata: {
                itemTitle: item.content.text.substring(0, 100),
                version: item.version,
                topics: item.topics,
            },
        };

        await this.sendWorkflowNotification(payload);

        // Send specific notifications based on action
        switch (action) {
            case WorkflowAction.SUBMITTED_FOR_REVIEW:
                await this.notifyReviewersOfNewSubmission(item, performedBy);
                break;
            case WorkflowAction.APPROVED:
                await this.notifyAuthorOfApproval(item, performedBy);
                break;
            case WorkflowAction.REJECTED:
                await this.notifyAuthorOfRejection(item, performedBy, message);
                break;
            case WorkflowAction.PUBLISHED:
                await this.notifyStakeholdersOfPublication(item, performedBy);
                break;
        }
    }

    private async notifyReviewersOfNewSubmission(item: Item, submittedBy: string): Promise<void> {
        // TODO: Get list of available reviewers and notify them
        this.logger.log(`Notifying reviewers of new submission: ${item.slug} by ${submittedBy}`);
    }

    private async notifyAuthorOfApproval(item: Item, approvedBy: string): Promise<void> {
        if (item.createdBy) {
            this.logger.log(`Notifying author ${item.createdBy} of approval for ${item.slug} by ${approvedBy}`);
        }
    }

    private async notifyAuthorOfRejection(item: Item, rejectedBy: string, reason?: string): Promise<void> {
        if (item.createdBy) {
            this.logger.log(`Notifying author ${item.createdBy} of rejection for ${item.slug} by ${rejectedBy}: ${reason}`);
        }
    }

    private async notifyStakeholdersOfPublication(item: Item, publishedBy: string): Promise<void> {
        this.logger.log(`Notifying stakeholders of publication: ${item.slug} by ${publishedBy}`);
    }

    private async mockNotificationDelivery(payload: NotificationPayload): Promise<void> {
        // Simulate async notification delivery
        return new Promise((resolve) => {
            setTimeout(() => {
                this.logger.debug(`Mock notification delivered: ${payload.action} for ${payload.itemSlug}`);
                resolve();
            }, 100);
        });
    }
}