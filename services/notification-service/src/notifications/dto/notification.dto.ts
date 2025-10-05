import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsBoolean, IsDateString } from 'class-validator';

export enum NotificationType {
    SPACED_REPETITION = 'spaced_repetition',
    ACHIEVEMENT = 'achievement',
    STREAK_REMINDER = 'streak_reminder',
    MOCK_TEST_REMINDER = 'mock_test_reminder',
    PLACEMENT_COMPLETE = 'placement_complete',
    SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export enum NotificationPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent',
}

export class CreateNotificationDto {
    @IsString()
    userId: string;

    @IsEnum(NotificationType)
    type: NotificationType;

    @IsString()
    title: string;

    @IsString()
    body: string;

    @IsOptional()
    @IsObject()
    data?: Record<string, any>;

    @IsOptional()
    @IsEnum(NotificationPriority)
    priority?: NotificationPriority = NotificationPriority.NORMAL;

    @IsOptional()
    @IsDateString()
    scheduledFor?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsString()
    templateId?: string;

    @IsOptional()
    @IsObject()
    templateData?: Record<string, any>;
}

export class SendNotificationDto {
    @IsString()
    userId: string;

    @IsString()
    title: string;

    @IsString()
    body: string;

    @IsOptional()
    @IsObject()
    data?: Record<string, any>;

    @IsOptional()
    @IsEnum(NotificationPriority)
    priority?: NotificationPriority = NotificationPriority.NORMAL;

    @IsOptional()
    @IsBoolean()
    silent?: boolean = false;
}

export class ScheduleNotificationDto extends CreateNotificationDto {
    @IsDateString()
    scheduledFor: string;
}

export class NotificationTemplateDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsEnum(NotificationType)
    type: NotificationType;

    @IsString()
    titleTemplate: string;

    @IsString()
    bodyTemplate: string;

    @IsOptional()
    @IsObject()
    defaultData?: Record<string, any>;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    requiredVariables?: string[];
}