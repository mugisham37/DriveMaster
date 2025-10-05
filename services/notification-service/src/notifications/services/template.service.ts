import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
    INotificationTemplate,
    RenderedNotification,
    ValidationResult,
    CreateTemplateRequest,
    NotificationTemplate
} from '../interfaces/notification.interface';
import { NotificationType } from '../dto/notification.dto';

@Injectable()
export class NotificationTemplateService implements INotificationTemplate {
    private readonly logger = new Logger(NotificationTemplateService.name);
    private templates: Map<string, NotificationTemplate> = new Map();

    constructor() {
        this.initializeDefaultTemplates();
    }

    private initializeDefaultTemplates() {
        const defaultTemplates: CreateTemplateRequest[] = [
            {
                name: 'Spaced Repetition Reminder',
                type: NotificationType.SPACED_REPETITION,
                titleTemplate: 'Time to review {{topicName}}!',
                bodyTemplate: 'You have {{itemCount}} items ready for review. Keep your streak going!',
                defaultData: { topicName: 'your topics', itemCount: '5' },
                requiredVariables: ['topicName', 'itemCount'],
            },
            {
                name: 'Achievement Unlocked',
                type: NotificationType.ACHIEVEMENT,
                titleTemplate: '🎉 Achievement Unlocked!',
                bodyTemplate: 'Congratulations! You\'ve earned the "{{achievementName}}" achievement for {{achievementDescription}}.',
                defaultData: { achievementName: 'Learner', achievementDescription: 'completing your first lesson' },
                requiredVariables: ['achievementName', 'achievementDescription'],
            },
            {
                name: 'Streak Reminder',
                type: NotificationType.STREAK_REMINDER,
                titleTemplate: 'Don\'t break your {{streakCount}}-day streak!',
                bodyTemplate: 'You\'re doing great! Complete today\'s practice to maintain your {{streakCount}}-day learning streak.',
                defaultData: { streakCount: '7' },
                requiredVariables: ['streakCount'],
            },
            {
                name: 'Mock Test Reminder',
                type: NotificationType.MOCK_TEST_REMINDER,
                titleTemplate: 'Ready for a mock test?',
                bodyTemplate: 'Based on your progress, you\'re ready to take a {{testType}} mock test. Your estimated pass rate is {{passRate}}%.',
                defaultData: { testType: 'driving theory', passRate: '85' },
                requiredVariables: ['testType', 'passRate'],
            },
            {
                name: 'Placement Test Complete',
                type: NotificationType.PLACEMENT_COMPLETE,
                titleTemplate: 'Placement test completed!',
                bodyTemplate: 'Great job! Your personalized learning path is ready. You\'re estimated to be at {{skillLevel}} level.',
                defaultData: { skillLevel: 'intermediate' },
                requiredVariables: ['skillLevel'],
            },
            {
                name: 'System Announcement',
                type: NotificationType.SYSTEM_ANNOUNCEMENT,
                titleTemplate: '{{announcementTitle}}',
                bodyTemplate: '{{announcementBody}}',
                defaultData: { announcementTitle: 'System Update', announcementBody: 'We have exciting new features!' },
                requiredVariables: ['announcementTitle', 'announcementBody'],
            },
        ];

        defaultTemplates.forEach(template => {
            try {
                this.createTemplate(template);
            } catch (error) {
                this.logger.error(`Failed to create default template: ${template.name}`, error);
            }
        });

        this.logger.log(`Initialized ${defaultTemplates.length} default notification templates`);
    }

    async render(templateId: string, data: Record<string, any>): Promise<RenderedNotification> {
        const template = await this.getTemplate(templateId);
        if (!template) {
            throw new NotFoundException(`Template with ID ${templateId} not found`);
        }

        // Validate required variables
        const validation = await this.validate(templateId, data);
        if (!validation.isValid) {
            throw new BadRequestException(`Template validation failed: ${validation.errors?.join(', ')}`);
        }

        // Merge with default data
        const mergedData = { ...template.defaultData, ...data };

        // Render title and body
        const title = this.renderTemplate(template.titleTemplate, mergedData);
        const body = this.renderTemplate(template.bodyTemplate, mergedData);

        return {
            title,
            body,
            data: mergedData,
        };
    }

    async validate(templateId: string, data: Record<string, any>): Promise<ValidationResult> {
        const template = await this.getTemplate(templateId);
        if (!template) {
            return {
                isValid: false,
                errors: [`Template with ID ${templateId} not found`],
            };
        }

        const errors: string[] = [];
        const missingVariables: string[] = [];

        // Check required variables
        if (template.requiredVariables) {
            for (const variable of template.requiredVariables) {
                if (!(variable in data) && !(variable in (template.defaultData || {}))) {
                    missingVariables.push(variable);
                }
            }
        }

        if (missingVariables.length > 0) {
            errors.push(`Missing required variables: ${missingVariables.join(', ')}`);
        }

        // Validate template syntax by attempting to render with merged data
        try {
            const mergedData = { ...template.defaultData, ...data };
            this.renderTemplate(template.titleTemplate, mergedData);
            this.renderTemplate(template.bodyTemplate, mergedData);
        } catch (error) {
            errors.push(`Template rendering error: ${error.message}`);
        }

        return {
            isValid: errors.length === 0,
            missingVariables: missingVariables.length > 0 ? missingVariables : undefined,
            errors: errors.length > 0 ? errors : undefined,
        };
    }

    async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
        return this.templates.get(templateId) || null;
    }

    async createTemplate(request: CreateTemplateRequest): Promise<NotificationTemplate> {
        const id = this.generateTemplateId(request.name, request.type);

        const template: NotificationTemplate = {
            id,
            name: request.name,
            type: request.type,
            titleTemplate: request.titleTemplate,
            bodyTemplate: request.bodyTemplate,
            defaultData: request.defaultData,
            requiredVariables: request.requiredVariables,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Validate template syntax
        try {
            const testData = { ...request.defaultData };
            if (request.requiredVariables) {
                request.requiredVariables.forEach(variable => {
                    if (!(variable in testData)) {
                        testData[variable] = 'test_value';
                    }
                });
            }

            this.renderTemplate(request.titleTemplate, testData);
            this.renderTemplate(request.bodyTemplate, testData);
        } catch (error) {
            throw new BadRequestException(`Invalid template syntax: ${error.message}`);
        }

        this.templates.set(id, template);
        this.logger.log(`Created notification template: ${template.name} (${id})`);

        return template;
    }

    async updateTemplate(templateId: string, updates: Partial<CreateTemplateRequest>): Promise<NotificationTemplate> {
        const template = await this.getTemplate(templateId);
        if (!template) {
            throw new NotFoundException(`Template with ID ${templateId} not found`);
        }

        const updatedTemplate: NotificationTemplate = {
            ...template,
            ...updates,
            updatedAt: new Date(),
        };

        // Validate updated template if templates changed
        if (updates.titleTemplate || updates.bodyTemplate || updates.requiredVariables) {
            try {
                const testData = { ...updatedTemplate.defaultData };
                if (updatedTemplate.requiredVariables) {
                    updatedTemplate.requiredVariables.forEach(variable => {
                        if (!(variable in testData)) {
                            testData[variable] = 'test_value';
                        }
                    });
                }

                this.renderTemplate(updatedTemplate.titleTemplate, testData);
                this.renderTemplate(updatedTemplate.bodyTemplate, testData);
            } catch (error) {
                throw new BadRequestException(`Invalid template syntax: ${error.message}`);
            }
        }

        this.templates.set(templateId, updatedTemplate);
        this.logger.log(`Updated notification template: ${templateId}`);

        return updatedTemplate;
    }

    async deleteTemplate(templateId: string): Promise<boolean> {
        const deleted = this.templates.delete(templateId);
        if (deleted) {
            this.logger.log(`Deleted notification template: ${templateId}`);
        }
        return deleted;
    }

    async listTemplates(type?: NotificationType): Promise<NotificationTemplate[]> {
        const templates = Array.from(this.templates.values());

        if (type) {
            return templates.filter(template => template.type === type && template.isActive);
        }

        return templates.filter(template => template.isActive);
    }

    private renderTemplate(template: string, data: Record<string, any>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
            if (variable in data) {
                return String(data[variable]);
            }
            throw new Error(`Variable '${variable}' not found in template data`);
        });
    }

    private generateTemplateId(name: string, type: NotificationType): string {
        const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const timestamp = Date.now().toString(36);
        return `${type}_${sanitizedName}_${timestamp}`;
    }

    // Get template by type and name (for easier lookup)
    async getTemplateByTypeAndName(type: NotificationType, name: string): Promise<NotificationTemplate | null> {
        const templates = Array.from(this.templates.values());
        return templates.find(template =>
            template.type === type &&
            template.name.toLowerCase() === name.toLowerCase() &&
            template.isActive
        ) || null;
    }

    // Bulk template operations
    async createTemplates(requests: CreateTemplateRequest[]): Promise<NotificationTemplate[]> {
        const results: NotificationTemplate[] = [];

        for (const request of requests) {
            try {
                const template = await this.createTemplate(request);
                results.push(template);
            } catch (error) {
                this.logger.error(`Failed to create template: ${request.name}`, error);
                throw error;
            }
        }

        return results;
    }
}