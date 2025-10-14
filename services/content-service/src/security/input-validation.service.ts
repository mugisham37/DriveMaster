import { Injectable } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class InputValidationService {
    /**
     * Validate input against a Zod schema
     */
    validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
        try {
            return schema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
            }
            throw error;
        }
    }

    /**
     * Sanitize string input to prevent XSS attacks
     */
    sanitizeString(input: string): string {
        if (typeof input !== 'string') {
            return input;
        }

        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/data:text\/html/gi, '')
            .replace(/vbscript:/gi, '')
            .trim();
    }

    /**
     * Validate file upload
     */
    validateFileUpload(file: Express.Multer.File, allowedTypes: string[], maxSize: number): boolean {
        if (!file) {
            throw new Error('No file provided');
        }

        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }

        if (file.size > maxSize) {
            throw new Error(`File size ${file.size} exceeds maximum allowed size ${maxSize}`);
        }

        return true;
    }

    /**
     * Validate UUID format
     */
    validateUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Validate email format
     */
    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate URL format
     */
    validateURL(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sanitize object recursively
     */
    sanitizeObject(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj === 'string') {
            return this.sanitizeString(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        if (typeof obj === 'object') {
            const sanitized: any = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    sanitized[key] = this.sanitizeObject(obj[key]);
                }
            }
            return sanitized;
        }

        return obj;
    }
}