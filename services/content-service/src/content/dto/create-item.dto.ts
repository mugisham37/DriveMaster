import {
    IsString,
    IsArray,
    IsObject,
    IsEnum,
    IsNumber,
    IsOptional,
    ValidateNested,
    Min,
    Max,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemType, CognitiveLevel } from '../entities/item.entity';

class ContentDto {
    @ApiProperty({ description: 'Question text' })
    @IsString()
    text: string;

    @ApiPropertyOptional({ description: 'Rich formatting data' })
    @IsOptional()
    @IsObject()
    richFormatting?: any;

    @ApiPropertyOptional({ description: 'Instructions for the question' })
    @IsOptional()
    @IsString()
    instructions?: string;
}

class ChoiceDto {
    @ApiProperty({ description: 'Choice ID' })
    @IsString()
    id: string;

    @ApiProperty({ description: 'Choice text' })
    @IsString()
    text: string;

    @ApiPropertyOptional({ description: 'Choice explanation' })
    @IsOptional()
    @IsString()
    explanation?: string;
}

class CorrectDto {
    @ApiProperty({ description: 'Array of correct choice IDs' })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    choiceIds: string[];

    @ApiPropertyOptional({ description: 'Explanation for correct answer' })
    @IsOptional()
    @IsString()
    explanation?: string;
}

class ExplanationDto {
    @ApiProperty({ description: 'Explanation text' })
    @IsString()
    text: string;

    @ApiPropertyOptional({ description: 'Rich formatting data' })
    @IsOptional()
    @IsObject()
    richFormatting?: any;
}

class ExternalRefDto {
    @ApiProperty({ description: 'Reference URL' })
    @IsString()
    url: string;

    @ApiProperty({ description: 'Reference title' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'Reference description' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateItemDto {
    @ApiProperty({ description: 'Unique slug for the item' })
    @IsString()
    slug: string;

    @ApiProperty({ description: 'Content structure', type: ContentDto })
    @ValidateNested()
    @Type(() => ContentDto)
    content: ContentDto;

    @ApiProperty({ description: 'Answer choices', type: [ChoiceDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChoiceDto)
    @ArrayMinSize(2)
    choices: ChoiceDto[];

    @ApiProperty({ description: 'Correct answer reference', type: CorrectDto })
    @ValidateNested()
    @Type(() => CorrectDto)
    correct: CorrectDto;

    @ApiPropertyOptional({ description: 'Detailed explanation', type: ExplanationDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ExplanationDto)
    explanation?: ExplanationDto;

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

    @ApiProperty({ description: 'Topic tags for BKT' })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    topics: string[];

    @ApiProperty({ description: 'Applicable jurisdictions' })
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    jurisdictions: string[];

    @ApiPropertyOptional({ description: 'Item type', enum: ItemType })
    @IsOptional()
    @IsEnum(ItemType)
    itemType?: ItemType;

    @ApiPropertyOptional({ description: 'Cognitive level', enum: CognitiveLevel })
    @IsOptional()
    @IsEnum(CognitiveLevel)
    cognitiveLevel?: CognitiveLevel;

    @ApiPropertyOptional({ description: 'External references', type: [ExternalRefDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExternalRefDto)
    externalRefs?: ExternalRefDto[];

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

    @ApiPropertyOptional({ description: 'Additional tags' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}