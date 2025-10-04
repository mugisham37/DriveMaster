import {
    IsString,
    IsOptional,
    IsEnum,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus } from '../entities/item.entity';

export class SubmitForReviewDto {
    @ApiPropertyOptional({ description: 'Optional message for reviewers' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;
}

export class ReviewItemDto {
    @ApiProperty({ description: 'Review decision', enum: ItemStatus })
    @IsEnum([ItemStatus.APPROVED, ItemStatus.DRAFT])
    decision: ItemStatus.APPROVED | ItemStatus.DRAFT;

    @ApiProperty({ description: 'Review comments' })
    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    comments: string;

    @ApiPropertyOptional({ description: 'Suggested changes if rejecting' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    suggestedChanges?: string;
}

export class AssignReviewerDto {
    @ApiProperty({ description: 'Reviewer user ID' })
    @IsUUID()
    reviewerId: string;

    @ApiPropertyOptional({ description: 'Assignment message' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;
}

export class PublishItemDto {
    @ApiPropertyOptional({ description: 'Scheduled publish date (ISO string)' })
    @IsOptional()
    @IsString()
    scheduledAt?: string;

    @ApiPropertyOptional({ description: 'Publication notes' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

export class WorkflowHistoryEntry {
    @ApiProperty({ description: 'Action performed' })
    action: string;

    @ApiProperty({ description: 'User who performed the action' })
    performedBy: string;

    @ApiProperty({ description: 'Timestamp of the action' })
    timestamp: Date;

    @ApiProperty({ description: 'Previous status' })
    previousStatus: ItemStatus;

    @ApiProperty({ description: 'New status' })
    newStatus: ItemStatus;

    @ApiPropertyOptional({ description: 'Action comments' })
    comments?: string;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    metadata?: Record<string, any>;
}

export class BulkWorkflowDto {
    @ApiProperty({ description: 'Array of item IDs to process' })
    @IsUUID(4, { each: true })
    itemIds: string[];

    @ApiProperty({ description: 'Workflow action to perform' })
    @IsEnum(['submit_for_review', 'approve', 'reject', 'publish', 'archive'])
    action: 'submit_for_review' | 'approve' | 'reject' | 'publish' | 'archive';

    @ApiPropertyOptional({ description: 'Comments for the bulk action' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    comments?: string;
}

export class BulkWorkflowResult {
    @ApiProperty({ description: 'Successfully processed items' })
    successful: string[];

    @ApiProperty({ description: 'Failed items with error messages' })
    failed: Array<{
        itemId: string;
        error: string;
    }>;

    @ApiProperty({ description: 'Total items processed' })
    totalProcessed: number;

    @ApiProperty({ description: 'Number of successful operations' })
    successCount: number;

    @ApiProperty({ description: 'Number of failed operations' })
    failureCount: number;
}