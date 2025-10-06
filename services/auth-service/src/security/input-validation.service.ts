import { Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class InputValidationService {

    /**
     * Sanitizes HTML content to prevent XSS attacks
     */
    sanitizeHtml(input: string): string {
        if (!input) return input;
        return DOMPurify.sanitize(input, {
            ALLOWED_TAGS: [], // No HTML tags allowed
            ALLOWED_ATTR: []
        });
    }

    /**
     * Validates and sanitizes email input
     */
    validateAndSanitizeEmail(email: string): string {
        if (!email) {
            throw new BadRequestException('Email is required');
        }

        // Basic sanitization
        email = email.trim().toLowerCase();

        // Length validation
        if (email.length > 254) {
            throw new BadRequestException('Email too long');
        }

        // Check for suspicious patterns first
        if (this.containsSuspiciousPatterns(email)) {
            throw new BadRequestException('Email contains invalid content');
        }

        // Email format validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            throw new BadRequestException('Invalid email format');
        }

        return email;
    }

    /**
     * Validates and sanitizes text input
     */
    validateAndSanitizeText(text: string, maxLength: number = 1000, fieldName: string = 'text'): string {
        if (!text) return text;

        // Check for valid UTF-8 and length
        if (text.length > maxLength) {
            throw new BadRequestException(`${fieldName} too long (max ${maxLength} characters)`);
        }

        // Check for suspicious patterns
        if (this.containsSuspiciousPatterns(text)) {
            throw new BadRequestException(`${fieldName} contains invalid content`);
        }

        // Sanitize HTML
        const sanitized = this.sanitizeHtml(text);

        // Check for control characters (except newlines and tabs)
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(sanitized)) {
            throw new BadRequestException(`${fieldName} contains invalid characters`);
        }

        return sanitized.trim();
    }

    /**
     * Validates UUID format
     */
    validateUUID(id: string, fieldName: string = 'ID'): void {
        if (!id) {
            throw new BadRequestException(`${fieldName} is required`);
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format`);
        }
    }

    /**
     * Validates country code (ISO 3166-1 alpha-2)
     */
    validateCountryCode(code: string): string {
        if (!code) {
            throw new BadRequestException('Country code is required');
        }

        code = code.toUpperCase().trim();

        if (code.length !== 2) {
            throw new BadRequestException('Country code must be 2 characters');
        }

        if (!/^[A-Z]{2}$/.test(code)) {
            throw new BadRequestException('Country code must contain only letters');
        }

        return code;
    }

    /**
     * Validates language code (ISO 639-1 with optional region)
     */
    validateLanguageCode(code: string): string {
        if (!code) {
            throw new BadRequestException('Language code is required');
        }

        code = code.toLowerCase().trim();

        const langRegex = /^[a-z]{2}(-[a-z]{2})?$/;
        if (!langRegex.test(code)) {
            throw new BadRequestException('Invalid language code format');
        }

        return code;
    }

    /**
     * Validates password strength
     */
    validatePassword(password: string): void {
        if (!password) {
            throw new BadRequestException('Password is required');
        }

        if (password.length < 8) {
            throw new BadRequestException('Password must be at least 8 characters');
        }

        if (password.length > 128) {
            throw new BadRequestException('Password must be less than 128 characters');
        }

        // Check for required character types
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasDigit = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        const errors: string[] = [];
        if (!hasLower) errors.push('lowercase letters');
        if (!hasUpper) errors.push('uppercase letters');
        if (!hasDigit) errors.push('digits');
        if (!hasSpecial) errors.push('special characters');

        if (errors.length > 0) {
            throw new BadRequestException(`Password must contain ${errors.join(', ')}`);
        }

        // Check for common patterns
        const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'user'];
        const lowerPassword = password.toLowerCase();
        for (const pattern of commonPatterns) {
            if (lowerPassword.includes(pattern)) {
                throw new BadRequestException('Password contains common patterns');
            }
        }
    }

    /**
     * Validates JSON input
     */
    validateJSON(jsonStr: string, fieldName: string = 'JSON'): any {
        if (!jsonStr) return null;

        // Check for prototype pollution patterns in the string first
        if (jsonStr.includes('__proto__') || jsonStr.includes('constructor') || jsonStr.includes('prototype')) {
            throw new BadRequestException(`${fieldName} contains invalid properties`);
        }

        try {
            const parsed = JSON.parse(jsonStr);

            // Double-check for prototype pollution attempts
            if (this.hasPrototypePollution(parsed)) {
                throw new BadRequestException(`${fieldName} contains invalid properties`);
            }

            return parsed;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Invalid ${fieldName} format`);
        }
    }

    /**
     * Validates IP address format
     */
    validateIPAddress(ip: string): void {
        if (!ip) {
            throw new BadRequestException('IP address is required');
        }

        // IPv4 regex
        const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // IPv6 regex (simplified, supports compressed format)
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/;

        if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
            throw new BadRequestException('Invalid IP address format');
        }
    }

    /**
     * Validates user agent string
     */
    validateUserAgent(userAgent: string): string {
        if (!userAgent) return userAgent; // User agent is optional

        if (userAgent.length > 512) {
            throw new BadRequestException('User agent too long');
        }

        if (this.containsSuspiciousPatterns(userAgent)) {
            throw new BadRequestException('User agent contains invalid content');
        }

        return this.sanitizeHtml(userAgent);
    }

    /**
     * Checks if input contains suspicious patterns
     */
    private containsSuspiciousPatterns(input: string): boolean {
        if (!input) return false;

        const suspiciousPatterns = [
            // SQL injection patterns
            /(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b|\binsert\b.*\binto\b|\bupdate\b.*\bset\b|\bdelete\b.*\bfrom\b)/i,
            /(\bdrop\b.*\btable\b|\bcreate\b.*\btable\b|\balter\b.*\btable\b|\btruncate\b.*\btable\b)/i,
            /(exec\s*\(|execute\s*\(|sp_executesql)/i,
            /(\-\-|\#|\/\*|\*\/)/,
            /(0x[0-9a-f]+|char\s*\(|ascii\s*\(|substring\s*\()/i,

            // XSS patterns
            /<script[^>]*>.*?<\/script>/i,
            /<iframe[^>]*>.*?<\/iframe>/i,
            /<object[^>]*>.*?<\/object>/i,
            /<embed[^>]*>.*?<\/embed>/i,
            /<link[^>]*>/i,
            /<meta[^>]*>/i,
            /javascript:|vbscript:|data:|about:/i,
            /on\w+\s*=/i,

            // Path traversal patterns
            /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c|%252e%252e%252f|%252e%252e%255c/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(input.toLowerCase()));
    }

    /**
     * Checks for prototype pollution attempts
     */
    private hasPrototypePollution(obj: any): boolean {
        if (typeof obj !== 'object' || obj === null) return false;

        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

        for (const key of Object.keys(obj)) {
            if (dangerousKeys.includes(key)) {
                return true;
            }

            if (typeof obj[key] === 'object' && this.hasPrototypePollution(obj[key])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validates class-validator DTOs
     */
    async validateDTO(dto: any): Promise<void> {
        const errors = await validate(dto);
        if (errors.length > 0) {
            const messages = errors.map(error =>
                Object.values(error.constraints || {}).join(', ')
            ).join('; ');
            throw new BadRequestException(`Validation failed: ${messages}`);
        }
    }
}