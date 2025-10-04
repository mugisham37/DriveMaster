import { Injectable, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

// Zod schemas for content validation
const ContentSchema = z.object({
    text: z.string().min(1, 'Content text is required'),
    richFormatting: z.any().optional(),
    instructions: z.string().optional(),
});

const ChoiceSchema = z.object({
    id: z.string().min(1, 'Choice ID is required'),
    text: z.string().min(1, 'Choice text is required'),
    explanation: z.string().optional(),
});

const CorrectAnswerSchema = z.object({
    choiceIds: z.array(z.string()).min(1, 'At least one correct choice is required'),
    explanation: z.string().optional(),
});

const ExplanationSchema = z.object({
    text: z.string().min(1, 'Explanation text is required'),
    richFormatting: z.any().optional(),
});

const ItemContentSchema = z.object({
    content: ContentSchema,
    choices: z.array(ChoiceSchema).min(2, 'At least 2 choices are required'),
    correct: CorrectAnswerSchema,
    explanation: ExplanationSchema.optional(),
    topics: z.array(z.string()).min(1, 'At least one topic is required'),
    jurisdictions: z.array(z.string()).min(1, 'At least one jurisdiction is required'),
    difficulty: z.number().min(-3).max(3).optional(),
    discrimination: z.number().min(0.1).max(3).optional(),
    guessing: z.number().min(0).max(1).optional(),
});

@Injectable()
export class ValidationService {
    validateItemContent(data: any): void {
        try {
            ItemContentSchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorMessages = error.errors.map(err =>
                    `${err.path.join('.')}: ${err.message}`
                ).join(', ');
                throw new BadRequestException(`Validation failed: ${errorMessages}`);
            }
            throw error;
        }
    }

    validateChoiceReferences(choices: any[], correct: any): void {
        const choiceIds = choices.map(choice => choice.id);
        const invalidChoiceIds = correct.choiceIds.filter(
            id => !choiceIds.includes(id)
        );

        if (invalidChoiceIds.length > 0) {
            throw new BadRequestException(
                `Invalid choice IDs in correct answer: ${invalidChoiceIds.join(', ')}`
            );
        }
    }

    validateDifficultyParameters(difficulty?: number, discrimination?: number, guessing?: number): void {
        if (difficulty !== undefined && (difficulty < -3 || difficulty > 3)) {
            throw new BadRequestException('Difficulty must be between -3 and 3');
        }

        if (discrimination !== undefined && (discrimination < 0.1 || discrimination > 3)) {
            throw new BadRequestException('Discrimination must be between 0.1 and 3');
        }

        if (guessing !== undefined && (guessing < 0 || guessing > 1)) {
            throw new BadRequestException('Guessing parameter must be between 0 and 1');
        }
    }

    validateTopicsAndJurisdictions(topics: string[], jurisdictions: string[]): void {
        if (!topics || topics.length === 0) {
            throw new BadRequestException('At least one topic is required');
        }

        if (!jurisdictions || jurisdictions.length === 0) {
            throw new BadRequestException('At least one jurisdiction is required');
        }

        // Validate topic format (alphanumeric with underscores and hyphens)
        const topicRegex = /^[a-zA-Z0-9_-]+$/;
        const invalidTopics = topics.filter(topic => !topicRegex.test(topic));
        if (invalidTopics.length > 0) {
            throw new BadRequestException(
                `Invalid topic format: ${invalidTopics.join(', ')}. Topics must be alphanumeric with underscores and hyphens only.`
            );
        }

        // Validate jurisdiction format (ISO country codes)
        const jurisdictionRegex = /^[A-Z]{2}$/;
        const invalidJurisdictions = jurisdictions.filter(jurisdiction => !jurisdictionRegex.test(jurisdiction));
        if (invalidJurisdictions.length > 0) {
            throw new BadRequestException(
                `Invalid jurisdiction format: ${invalidJurisdictions.join(', ')}. Jurisdictions must be 2-letter ISO country codes.`
            );
        }
    }

    validateSlugFormat(slug: string): void {
        // Slug should be URL-friendly: lowercase letters, numbers, hyphens
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(slug)) {
            throw new BadRequestException(
                'Slug must contain only lowercase letters, numbers, and hyphens'
            );
        }

        if (slug.length < 3 || slug.length > 100) {
            throw new BadRequestException('Slug must be between 3 and 100 characters');
        }

        if (slug.startsWith('-') || slug.endsWith('-')) {
            throw new BadRequestException('Slug cannot start or end with a hyphen');
        }
    }

    validateMediaMetadata(mediaType: string, metadata: any): void {
        switch (mediaType) {
            case 'image':
                if (metadata.width && (metadata.width < 1 || metadata.width > 10000)) {
                    throw new BadRequestException('Image width must be between 1 and 10000 pixels');
                }
                if (metadata.height && (metadata.height < 1 || metadata.height > 10000)) {
                    throw new BadRequestException('Image height must be between 1 and 10000 pixels');
                }
                break;
            case 'video':
            case 'audio':
                if (metadata.duration && (metadata.duration < 1 || metadata.duration > 7200)) {
                    throw new BadRequestException('Media duration must be between 1 and 7200 seconds (2 hours)');
                }
                break;
        }

        if (metadata.alt && metadata.alt.length > 255) {
            throw new BadRequestException('Alt text must be 255 characters or less');
        }

        if (metadata.caption && metadata.caption.length > 1000) {
            throw new BadRequestException('Caption must be 1000 characters or less');
        }
    }
}