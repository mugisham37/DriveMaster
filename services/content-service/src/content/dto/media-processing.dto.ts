import {
    IsString,
    IsEnum,
    IsOptional,
    IsBoolean,
    IsNumber,
    Min,
    Max,
    IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '../entities/media-asset.entity';

export class MediaProcessingOptionsDto {
    @ApiPropertyOptional({ description: 'Generate thumbnail for the media' })
    @IsOptional()
    @IsBoolean()
    generateThumbnail?: boolean;

    @ApiPropertyOptional({ description: 'Generate responsive versions (images only)' })
    @IsOptional()
    @IsBoolean()
    generateResponsiveVersions?: boolean;

    @ApiPropertyOptional({ description: 'Process video file' })
    @IsOptional()
    @IsBoolean()
    processVideo?: boolean;

    @ApiPropertyOptional({ description: 'Process audio file' })
    @IsOptional()
    @IsBoolean()
    processAudio?: boolean;

    @ApiPropertyOptional({
        description: 'Processing quality',
        enum: ['low', 'medium', 'high']
    })
    @IsOptional()
    @IsIn(['low', 'medium', 'high'])
    quality?: 'low' | 'medium' | 'high';
}

export class ImageProcessingDto extends MediaProcessingOptionsDto {
    @ApiPropertyOptional({ description: 'Target width in pixels' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(4096)
    width?: number;

    @ApiPropertyOptional({ description: 'Target height in pixels' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(4096)
    height?: number;

    @ApiPropertyOptional({
        description: 'Output format',
        enum: ['jpeg', 'png', 'webp']
    })
    @IsOptional()
    @IsIn(['jpeg', 'png', 'webp'])
    format?: 'jpeg' | 'png' | 'webp';

    @ApiPropertyOptional({ description: 'Thumbnail size in pixels' })
    @IsOptional()
    @IsNumber()
    @Min(50)
    @Max(500)
    thumbnailSize?: number;
}

export class VideoProcessingDto extends MediaProcessingOptionsDto {
    @ApiPropertyOptional({ description: 'Target width in pixels' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(1920)
    width?: number;

    @ApiPropertyOptional({ description: 'Target height in pixels' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(1080)
    height?: number;

    @ApiPropertyOptional({ description: 'Thumbnail capture time in seconds' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    thumbnailTime?: number;
}

export class AudioProcessingDto extends MediaProcessingOptionsDto {
    @ApiPropertyOptional({ description: 'Audio bitrate (e.g., 128k, 256k)' })
    @IsOptional()
    @IsString()
    bitrate?: string;

    @ApiPropertyOptional({
        description: 'Audio format',
        enum: ['mp3', 'aac', 'ogg']
    })
    @IsOptional()
    @IsIn(['mp3', 'aac', 'ogg'])
    format?: 'mp3' | 'aac' | 'ogg';

    @ApiPropertyOptional({ description: 'Normalize audio levels' })
    @IsOptional()
    @IsBoolean()
    normalize?: boolean;
}

export class BulkUploadDto {
    @ApiProperty({ description: 'Media type for all files', enum: MediaType })
    @IsEnum(MediaType)
    mediaType: MediaType;

    @ApiPropertyOptional({ description: 'Processing options' })
    @IsOptional()
    processingOptions?: MediaProcessingOptionsDto;

    @ApiPropertyOptional({ description: 'Alt text template (use {filename} placeholder)' })
    @IsOptional()
    @IsString()
    altTemplate?: string;

    @ApiPropertyOptional({ description: 'Caption template (use {filename} placeholder)' })
    @IsOptional()
    @IsString()
    captionTemplate?: string;
}

export class MediaAssetUpdateDto {
    @ApiPropertyOptional({ description: 'Alt text for accessibility' })
    @IsOptional()
    @IsString()
    alt?: string;

    @ApiPropertyOptional({ description: 'Caption for the media' })
    @IsOptional()
    @IsString()
    caption?: string;

    @ApiPropertyOptional({ description: 'Width in pixels' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    width?: number;

    @ApiPropertyOptional({ description: 'Height in pixels' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    height?: number;

    @ApiPropertyOptional({ description: 'Duration in seconds' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    duration?: number;

    @ApiPropertyOptional({ description: 'CDN URL override' })
    @IsOptional()
    @IsString()
    cdnUrl?: string;
}

export class MediaCleanupOptionsDto {
    @ApiPropertyOptional({ description: 'Retention period in days' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(3650) // 10 years max
    retentionDays?: number;

    @ApiPropertyOptional({ description: 'Dry run - don\'t actually delete' })
    @IsOptional()
    @IsBoolean()
    dryRun?: boolean;

    @ApiPropertyOptional({ description: 'Media types to clean up' })
    @IsOptional()
    @IsEnum(MediaType, { each: true })
    mediaTypes?: MediaType[];

    @ApiPropertyOptional({ description: 'Maximum number of assets to process' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10000)
    maxAssets?: number;
}