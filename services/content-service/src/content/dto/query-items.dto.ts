import {
    IsOptional,
    IsString,
    IsArray,
    IsEnum,
    IsNumber,
    Min,
    Max,
    IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus, ItemType, CognitiveLevel } from '../entities/item.entity';

export class QueryItemsDto {
    @ApiPropertyOptional({ description: 'Search query for full-text search' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by status', enum: ItemStatus })
    @IsOptional()
    @IsEnum(ItemStatus)
    status?: ItemStatus;

    @ApiPropertyOptional({ description: 'Filter by item type', enum: ItemType })
    @IsOptional()
    @IsEnum(ItemType)
    itemType?: ItemType;

    @ApiPropertyOptional({ description: 'Filter by cognitive level', enum: CognitiveLevel })
    @IsOptional()
    @IsEnum(CognitiveLevel)
    cognitiveLevel?: CognitiveLevel;

    @ApiPropertyOptional({ description: 'Filter by topics' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => Array.isArray(value) ? value : [value])
    topics?: string[];

    @ApiPropertyOptional({ description: 'Filter by jurisdictions' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => Array.isArray(value) ? value : [value])
    jurisdictions?: string[];

    @ApiPropertyOptional({ description: 'Filter by tags' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => Array.isArray(value) ? value : [value])
    tags?: string[];

    @ApiPropertyOptional({ description: 'Minimum difficulty', minimum: -3, maximum: 3 })
    @IsOptional()
    @IsNumber()
    @Min(-3)
    @Max(3)
    @Type(() => Number)
    minDifficulty?: number;

    @ApiPropertyOptional({ description: 'Maximum difficulty', minimum: -3, maximum: 3 })
    @IsOptional()
    @IsNumber()
    @Min(-3)
    @Max(3)
    @Type(() => Number)
    maxDifficulty?: number;

    @ApiPropertyOptional({ description: 'Filter by creator ID' })
    @IsOptional()
    @IsString()
    createdBy?: string;

    @ApiPropertyOptional({ description: 'Include inactive items', default: false })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    includeInactive?: boolean;

    @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}