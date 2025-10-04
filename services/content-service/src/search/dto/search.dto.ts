import {
    IsOptional,
    IsString,
    IsArray,
    IsNumber,
    Min,
    Max,
    IsEnum,
    IsObject,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemType, CognitiveLevel } from '../../content/entities/item.entity';

export class SearchRequestDto {
    @ApiPropertyOptional({ description: 'Search query for full-text search' })
    @IsOptional()
    @IsString()
    query?: string;

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

    @ApiPropertyOptional({ description: 'Filter by item types', enum: ItemType, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(ItemType, { each: true })
    @Transform(({ value }) => Array.isArray(value) ? value : [value])
    itemTypes?: ItemType[];

    @ApiPropertyOptional({ description: 'Filter by cognitive levels', enum: CognitiveLevel, isArray: true })
    @IsOptional()
    @IsArray()
    @IsEnum(CognitiveLevel, { each: true })
    @Transform(({ value }) => Array.isArray(value) ? value : [value])
    cognitiveLevels?: CognitiveLevel[];

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

    @ApiPropertyOptional({
        description: 'Sort field',
        enum: ['relevance', 'createdAt', 'updatedAt', 'publishedAt', 'difficulty', 'estimatedTime', 'points'],
        default: 'relevance'
    })
    @IsOptional()
    @IsString()
    sortBy?: string = 'relevance';

    @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class SelectedFacetsDto {
    @ApiPropertyOptional({ description: 'Selected topics' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    topics?: string[];

    @ApiPropertyOptional({ description: 'Selected jurisdictions' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    jurisdictions?: string[];

    @ApiPropertyOptional({ description: 'Selected item types' })
    @IsOptional()
    @IsArray()
    @IsEnum(ItemType, { each: true })
    itemTypes?: ItemType[];

    @ApiPropertyOptional({ description: 'Selected cognitive levels' })
    @IsOptional()
    @IsArray()
    @IsEnum(CognitiveLevel, { each: true })
    cognitiveLevels?: CognitiveLevel[];

    @ApiPropertyOptional({ description: 'Selected tags' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ description: 'Minimum difficulty' })
    @IsOptional()
    @IsNumber()
    @Min(-3)
    @Max(3)
    minDifficulty?: number;

    @ApiPropertyOptional({ description: 'Maximum difficulty' })
    @IsOptional()
    @IsNumber()
    @Min(-3)
    @Max(3)
    maxDifficulty?: number;
}

export class FacetedSearchDto {
    @ApiPropertyOptional({ description: 'Search query' })
    @IsOptional()
    @IsString()
    query?: string;

    @ApiProperty({ description: 'Selected facets for filtering' })
    @IsObject()
    @Type(() => SelectedFacetsDto)
    selectedFacets: SelectedFacetsDto;

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

    @ApiPropertyOptional({ description: 'Sort field', default: 'relevance' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'relevance';

    @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class SearchSuggestionDto {
    @ApiProperty({ description: 'Suggestion text' })
    text: string;

    @ApiProperty({ description: 'Suggestion type', enum: ['content', 'topic', 'tag'] })
    type: 'content' | 'topic' | 'tag';

    @ApiProperty({ description: 'Relevance score' })
    score: number;
}

export class SearchHitDto {
    @ApiProperty({ description: 'Item ID' })
    id: string;

    @ApiProperty({ description: 'Item slug' })
    slug: string;

    @ApiProperty({ description: 'Content object' })
    content: any;

    @ApiProperty({ description: 'Answer choices' })
    choices: any[];

    @ApiProperty({ description: 'Correct answer' })
    correct: any;

    @ApiPropertyOptional({ description: 'Explanation' })
    explanation?: any;

    @ApiProperty({ description: 'Difficulty level' })
    difficulty: number;

    @ApiProperty({ description: 'Topics' })
    topics: string[];

    @ApiProperty({ description: 'Jurisdictions' })
    jurisdictions: string[];

    @ApiProperty({ description: 'Item type' })
    itemType: string;

    @ApiProperty({ description: 'Cognitive level' })
    cognitiveLevel: string;

    @ApiProperty({ description: 'Tags' })
    tags: string[];

    @ApiProperty({ description: 'Estimated time in seconds' })
    estimatedTime: number;

    @ApiProperty({ description: 'Points value' })
    points: number;

    @ApiProperty({ description: 'Relevance score' })
    score: number;

    @ApiPropertyOptional({ description: 'Search highlights' })
    highlights?: any;

    @ApiPropertyOptional({ description: 'Published date' })
    publishedAt?: Date;

    @ApiProperty({ description: 'Created date' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated date' })
    updatedAt: Date;
}

export class FacetBucketDto {
    @ApiProperty({ description: 'Facet key/value' })
    key: string;

    @ApiProperty({ description: 'Document count' })
    doc_count: number;

    @ApiPropertyOptional({ description: 'Range from value' })
    from?: number;

    @ApiPropertyOptional({ description: 'Range to value' })
    to?: number;
}

export class SearchFacetsDto {
    @ApiProperty({ description: 'Topic facets', type: [FacetBucketDto] })
    topics: FacetBucketDto[];

    @ApiProperty({ description: 'Jurisdiction facets', type: [FacetBucketDto] })
    jurisdictions: FacetBucketDto[];

    @ApiProperty({ description: 'Item type facets', type: [FacetBucketDto] })
    itemTypes: FacetBucketDto[];

    @ApiProperty({ description: 'Cognitive level facets', type: [FacetBucketDto] })
    cognitiveLevels: FacetBucketDto[];

    @ApiProperty({ description: 'Difficulty range facets', type: [FacetBucketDto] })
    difficultyRanges: FacetBucketDto[];

    @ApiProperty({ description: 'Tag facets', type: [FacetBucketDto] })
    tags: FacetBucketDto[];
}

export class SearchResponseDto {
    @ApiProperty({ description: 'Search results', type: [SearchHitDto] })
    hits: SearchHitDto[];

    @ApiProperty({ description: 'Total number of results' })
    total: number;

    @ApiProperty({ description: 'Current page' })
    page: number;

    @ApiProperty({ description: 'Items per page' })
    limit: number;

    @ApiProperty({ description: 'Total pages' })
    totalPages: number;

    @ApiProperty({ description: 'Search facets' })
    facets: SearchFacetsDto;

    @ApiProperty({ description: 'Search time in milliseconds' })
    took: number;
}

export class ReindexRequestDto {
    @ApiPropertyOptional({ description: 'Force reindex even if index exists', default: false })
    @IsOptional()
    force?: boolean = false;
}

export class IndexStatsDto {
    @ApiProperty({ description: 'Index name' })
    indexName: string;

    @ApiProperty({ description: 'Number of documents' })
    documentCount: number;

    @ApiProperty({ description: 'Index size in bytes' })
    indexSize: number;

    @ApiProperty({ description: 'Last updated timestamp' })
    lastUpdated: Date;
}