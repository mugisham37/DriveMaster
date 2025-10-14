import {
    IsString,
    IsArray,
    IsObject,
    IsEnum,
    IsNumber,
    IsOptional,
    ValidateNested,
    IsUUID,
    Min,
    Max,
    ArrayMinSize,
    IsBoolean,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus, ItemType, CognitiveLevel } from '../entities/item.entity';

// Bulk Import DTOs
export class BulkImportItemDto {
    @ApiProperty({ description: 'Unique slug for the item' })
    @IsString()
    slug: string;

    @ApiProperty({ description: 'Question text' })
    @IsString()
    questionText: string;

    @ApiPropertyOptional({ description: 'Question instructions' })
    @IsOptional()
    @IsString()
    instructions?: string;

    @ApiProperty({ description: 'Choice A text' })
    @IsString()
    choiceA: string;

    @ApiProperty({ description: 'Choice B text' })
    @IsString()
    choiceB: string;

    @ApiPropertyOptional({ description: 'Choice C text' })
    @IsOptional()
    @IsString()
    choiceC?: string;

    @ApiPropertyOptional({ description: 'Choice D text' })
    @IsOptional()
    @IsString()
    choiceD?: string;

    @ApiPropertyOptional({ description: 'Choice E text' })
    @IsOptional()
    @IsString()
    choiceE?: string;

    @ApiProperty({ description: 'Correct answer (A, B, C, D, or E)' })
    @IsString()
    correctAnswer: string;

    @ApiPropertyOptional({ description: 'Explanation text' })
    @IsOptional()
    @IsString()
    explanation?: string;

    @ApiPropertyOptional({ description: 'IRT difficulty parameter', minimum: -3, maximum: 3 })
    @IsOptional()
    @IsNumber()
    @Min(-3)
    @Max(3)
    difficulty?: number;

    @ApiPropertyOptional({ description: 'IRT discrimination parameter', minimum: 0.1, maximum: 3 })
    @IsOptional()
    @IsNumber()
    @Min(0.1)
    @Max(3)
    discrimination?: number;

    @ApiPropertyOptional({ description: 'IRT guessing parameter', minimum: 0, maximum: 1 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    guessing?: number;

    @ApiProperty({ description: 'Comma-separated topic tags' })
    @IsString()
    topics: string;

    @ApiProperty({ description: 'Comma-separated jurisdictions' })
    @IsString()
    jurisdictions: string;

    @ApiPropertyOptional({ description: 'Item type', enum: ItemType })
    @IsOptional()
    @IsEnum(ItemType)
    itemType?: ItemType;

    @ApiPropertyOptional({ description: 'Cognitive level', enum: CognitiveLevel })
    @IsOptional()
    @IsEnum(CognitiveLevel)
    cognitiveLevel?: CognitiveLevel;

    @ApiPropertyOptional({ description: 'Estimated time in seconds', minimum: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    estimatedTime?: number;

    @ApiPropertyOptional({ description: 'Point value', minimum: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    points?: number;

    @ApiPropertyOptional({ description: 'Comma-separated tags' })
    @IsOptional()
    @IsString()
    tags?: string;

    @ApiPropertyOptional({ description: 'External reference URL' })
    @IsOptional()
    @IsString()
    externalRefUrl?: string;

    @ApiPropertyOptional({ description: 'External reference title' })
    @IsOptional()
    @IsString()
    externalRefTitle?: string;
}

export class BulkImportRequestDto {
    @ApiProperty({ description: 'Import format', enum: ['csv', 'json'] })
    @IsEnum(['csv', 'json'])
    format: 'csv' | 'json';

    @ApiProperty({ description: 'Items to import', type: [BulkImportItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkImportItemDto)
    items: BulkImportItemDto[];

    @ApiPropertyOptional({ description: 'Validation mode', enum: ['strict', 'lenient'] })
    @IsOptional()
    @IsEnum(['strict', 'lenient'])
    validationMode?: 'strict' | 'lenient';

    @ApiPropertyOptional({ description: 'Skip duplicate slugs' })
    @IsOptional()
    @IsBoolean()
    skipDuplicates?: boolean;

    @ApiPropertyOptional({ description: 'Auto-generate slugs for duplicates' })
    @IsOptional()
    @IsBoolean()
    autoGenerateSlugs?: boolean;
}

export class BulkImportResultDto {
    @ApiProperty({ description: 'Total items processed' })
    totalProcessed: number;

    @ApiProperty({ description: 'Successfully imported items' })
    successCount: number;

    @ApiProperty({ description: 'Failed imports' })
    failureCount: number;

    @ApiProperty({ description: 'Skipped items (duplicates)' })
    skippedCount: number;

    @ApiProperty({ description: 'Successfully imported item IDs' })
    successful: string[];

    @ApiProperty({ description: 'Failed imports with errors' })
    failed: Array<{
        row: number;
        slug: string;
        error: string;
        details?: any;
    }>;

    @ApiProperty({ description: 'Skipped items' })
    skipped: Array<{
        row: number;
        slug: string;
        reason: string;
    }>;

    @ApiProperty({ description: 'Import summary' })
    summary: {
        importedByStatus: Record<ItemStatus, number>;
        importedByType: Record<ItemType, number>;
        importedByJurisdiction: Record<string, number>;
    };
}

// Bulk Export DTOs
export class BulkExportRequestDto {
    @ApiPropertyOptional({ description: 'Export format', enum: ['csv', 'json', 'xlsx'] })
    @IsOptional()
    @IsEnum(['csv', 'json', 'xlsx'])
    format?: 'csv' | 'json' | 'xlsx';

    @ApiPropertyOptional({ description: 'Filter by status', enum: ItemStatus, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(ItemStatus, { each: true })
    status?: ItemStatus[];

    @ApiPropertyOptional({ description: 'Filter by jurisdictions' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    jurisdictions?: string[];

    @ApiPropertyOptional({ description: 'Filter by topics' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    topics?: string[];

    @ApiPropertyOptional({ description: 'Filter by item type', enum: ItemType, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(ItemType, { each: true })
    itemType?: ItemType[];

    @ApiPropertyOptional({ description: 'Filter by cognitive level', enum: CognitiveLevel, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(CognitiveLevel, { each: true })
    cognitiveLevel?: CognitiveLevel[];

    @ApiPropertyOptional({ description: 'Filter by minimum difficulty' })
    @IsOptional()
    @IsNumber()
    @Min(-3)
    @Max(3)
    minDifficulty?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum difficulty' })
    @IsOptional()
    @IsNumber()
    @Min(-3)
    @Max(3)
    maxDifficulty?: number;

    @ApiPropertyOptional({ description: 'Filter by created date from' })
    @IsOptional()
    @IsDateString()
    createdFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by created date to' })
    @IsOptional()
    @IsDateString()
    createdTo?: string;

    @ApiPropertyOptional({ description: 'Filter by published date from' })
    @IsOptional()
    @IsDateString()
    publishedFrom?: string;

    @ApiPropertyOptional({ description: 'Filter by published date to' })
    @IsOptional()
    @IsDateString()
    publishedTo?: string;

    @ApiPropertyOptional({ description: 'Include inactive items' })
    @IsOptional()
    @IsBoolean()
    includeInactive?: boolean;

    @ApiPropertyOptional({ description: 'Include media asset information' })
    @IsOptional()
    @IsBoolean()
    includeMedia?: boolean;

    @ApiPropertyOptional({ description: 'Include workflow history' })
    @IsOptional()
    @IsBoolean()
    includeWorkflowHistory?: boolean;

    @ApiPropertyOptional({ description: 'Maximum number of items to export' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10000)
    limit?: number;
}

export class BulkExportResultDto {
    @ApiProperty({ description: 'Export job ID' })
    jobId: string;

    @ApiProperty({ description: 'Export status' })
    status: 'pending' | 'processing' | 'completed' | 'failed';

    @ApiProperty({ description: 'Total items to export' })
    totalItems: number;

    @ApiProperty({ description: 'Download URL (when completed)' })
    downloadUrl?: string;

    @ApiProperty({ description: 'File size in bytes (when completed)' })
    fileSize?: number;

    @ApiProperty({ description: 'Export created timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Export completed timestamp' })
    completedAt?: Date;

    @ApiProperty({ description: 'Error message (if failed)' })
    error?: string;
}

// Batch Operations DTOs
export class BatchOperationRequestDto {
    @ApiProperty({ description: 'Item IDs to process' })
    @IsArray()
    @IsUUID(4, { each: true })
    @ArrayMinSize(1)
    itemIds: string[];

    @ApiProperty({ description: 'Operation type', enum: ['approve', 'publish', 'archive', 'delete', 'duplicate'] })
    @IsEnum(['approve', 'publish', 'archive', 'delete', 'duplicate'])
    operation: 'approve' | 'publish' | 'archive' | 'delete' | 'duplicate';

    @ApiPropertyOptional({ description: 'Operation parameters' })
    @IsOptional()
    @IsObject()
    parameters?: {
        reason?: string;
        notes?: string;
        scheduledAt?: string;
        newSlugPrefix?: string;
        targetJurisdictions?: string[];
    };
}

export class BatchOperationResultDto {
    @ApiProperty({ description: 'Total items processed' })
    totalProcessed: number;

    @ApiProperty({ description: 'Successfully processed items' })
    successCount: number;

    @ApiProperty({ description: 'Failed operations' })
    failureCount: number;

    @ApiProperty({ description: 'Successfully processed item IDs' })
    successful: string[];

    @ApiProperty({ description: 'Failed operations with errors' })
    failed: Array<{
        itemId: string;
        error: string;
    }>;

    @ApiProperty({ description: 'Operation summary' })
    summary: {
        operation: string;
        performedBy: string;
        timestamp: Date;
    };
}

// Content Migration DTOs
export class ContentMigrationRequestDto {
    @ApiProperty({ description: 'Source environment', enum: ['development', 'staging', 'production'] })
    @IsEnum(['development', 'staging', 'production'])
    sourceEnvironment: 'development' | 'staging' | 'production';

    @ApiProperty({ description: 'Target environment', enum: ['development', 'staging', 'production'] })
    @IsEnum(['development', 'staging', 'production'])
    targetEnvironment: 'development' | 'staging' | 'production';

    @ApiPropertyOptional({ description: 'Filter by jurisdictions' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    jurisdictions?: string[];

    @ApiPropertyOptional({ description: 'Filter by topics' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    topics?: string[];

    @ApiPropertyOptional({ description: 'Only migrate published items' })
    @IsOptional()
    @IsBoolean()
    publishedOnly?: boolean;

    @ApiPropertyOptional({ description: 'Include media assets' })
    @IsOptional()
    @IsBoolean()
    includeMedia?: boolean;

    @ApiPropertyOptional({ description: 'Dry run (validation only)' })
    @IsOptional()
    @IsBoolean()
    dryRun?: boolean;
}

export class ContentMigrationResultDto {
    @ApiProperty({ description: 'Migration job ID' })
    jobId: string;

    @ApiProperty({ description: 'Migration status' })
    status: 'pending' | 'processing' | 'completed' | 'failed';

    @ApiProperty({ description: 'Total items to migrate' })
    totalItems: number;

    @ApiProperty({ description: 'Successfully migrated items' })
    migratedCount: number;

    @ApiProperty({ description: 'Failed migrations' })
    failedCount: number;

    @ApiProperty({ description: 'Migration details' })
    details: {
        itemsMigrated: string[];
        itemsFailed: Array<{
            itemId: string;
            error: string;
        }>;
        mediaMigrated: number;
        mediaFailed: number;
    };

    @ApiProperty({ description: 'Migration started timestamp' })
    startedAt: Date;

    @ApiProperty({ description: 'Migration completed timestamp' })
    completedAt?: Date;

    @ApiProperty({ description: 'Error message (if failed)' })
    error?: string;
}

// Content Analytics DTOs
export class ContentAnalyticsRequestDto {
    @ApiPropertyOptional({ description: 'Analysis period start date' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Analysis period end date' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Group by field', enum: ['jurisdiction', 'topic', 'itemType', 'cognitiveLevel', 'status'] })
    @IsOptional()
    @IsEnum(['jurisdiction', 'topic', 'itemType', 'cognitiveLevel', 'status'])
    groupBy?: 'jurisdiction' | 'topic' | 'itemType' | 'cognitiveLevel' | 'status';

    @ApiPropertyOptional({ description: 'Include usage statistics' })
    @IsOptional()
    @IsBoolean()
    includeUsage?: boolean;

    @ApiPropertyOptional({ description: 'Include performance metrics' })
    @IsOptional()
    @IsBoolean()
    includePerformance?: boolean;
}

export class ContentAnalyticsResultDto {
    @ApiProperty({ description: 'Total content items' })
    totalItems: number;

    @ApiProperty({ description: 'Items by status' })
    itemsByStatus: Record<ItemStatus, number>;

    @ApiProperty({ description: 'Items by type' })
    itemsByType: Record<ItemType, number>;

    @ApiProperty({ description: 'Items by jurisdiction' })
    itemsByJurisdiction: Record<string, number>;

    @ApiProperty({ description: 'Items by topic' })
    itemsByTopic: Record<string, number>;

    @ApiProperty({ description: 'Average difficulty by topic' })
    averageDifficultyByTopic: Record<string, number>;

    @ApiProperty({ description: 'Content creation trends' })
    creationTrends: Array<{
        date: string;
        count: number;
    }>;

    @ApiProperty({ description: 'Publication trends' })
    publicationTrends: Array<{
        date: string;
        count: number;
    }>;

    @ApiPropertyOptional({ description: 'Usage statistics (if requested)' })
    usageStats?: {
        totalAttempts: number;
        averageAccuracy: number;
        mostAttemptedItems: Array<{
            itemId: string;
            slug: string;
            attempts: number;
        }>;
    };

    @ApiPropertyOptional({ description: 'Performance metrics (if requested)' })
    performanceMetrics?: {
        averageResponseTime: number;
        difficultyCalibrationAccuracy: number;
        topPerformingTopics: Array<{
            topic: string;
            accuracy: number;
        }>;
    };
}