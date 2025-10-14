import {
    IsString,
    IsEnum,
    IsOptional,
    IsObject,
    IsNumber,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '../entities/media-asset.entity';
import { MediaProcessingOptionsDto } from './media-processing.dto';

export class UploadMediaDto {
    @ApiProperty({ description: 'Media type', enum: MediaType })
    @IsEnum(MediaType)
    mediaType: MediaType;

    @ApiPropertyOptional({ description: 'Alt text for accessibility' })
    @IsOptional()
    @IsString()
    alt?: string;

    @ApiPropertyOptional({ description: 'Caption for the media' })
    @IsOptional()
    @IsString()
    caption?: string;

    @ApiPropertyOptional({ description: 'Width in pixels (for images/videos)' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    width?: number;

    @ApiPropertyOptional({ description: 'Height in pixels (for images/videos)' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    height?: number;

    @ApiPropertyOptional({ description: 'Duration in seconds (for audio/video)' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    duration?: number;

    @ApiPropertyOptional({ description: 'Processing options for the media' })
    @IsOptional()
    @IsObject()
    processingOptions?: MediaProcessingOptionsDto;
}