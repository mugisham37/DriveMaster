import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as validator from 'validator';
import * as DOMPurify from 'isomorphic-dompurify';

export interface SecurityConfig {
    encryption: {
        algorithm: string;
        keyLength: number;
        ivLength: number;
    };
    validation: {
        maxStringLength: number;
        maxEmailLength: number;
        strictMode: boolean;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
}

@Injectable()
export class SecurityService {
    private readonly logger = new Logger(SecurityService.name);
    private readonly config: SecurityConfig;
    private readonly encryptionKey: Buffer;

    constructor(private readonly configService: ConfigService) {
        this.config = {
            encryption: {
                algorithm: 'aes-256-gcm',
                keyLength: 32,
                ivLength: 16,
            },
            validation: {
                maxStringLength: this.configService.get<number>('MAX_STRING_LENGTH', 1000),
                maxEmailLength: this.configService.get<number>('MAX_EMAIL_LENGTH', 254),
                strictMode: this.configService.get<boolean>('STRICT_VALIDATION', true),
            },
            rateLimit: {
                windowMs: this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
                maxRequests: this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 5),
            },
        };

        // Initialize encryption key
        const masterKey = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
        if (!masterKey) {
            throw new Error('MASTER_ENCRYPTION_KEY environment variable is required');
        }
        this.encryptionKey = crypto.scryptSync(masterKey, 'salt', this.config.encryption.keyLength);
    }

    /**
     * Validates and sanitizes string input
     */
    validateAndSanitizeString(input: string, fieldName: string, maxLength?: number): string {
        if (!input) {
            return input;
        }

        const limit = maxLength || this.config.validation.maxStringLength;

        // Length validation
        if (input.length > limit) {
            throw new Error(`${fieldName} exceeds maximum length of ${limit} characters`);
        }

        // Check for suspicious patterns
        if (this.containsSuspiciousPatterns(input)) {
            this.logger.warn(`Suspicious content detected in ${fieldName}`, { input: input.substring(0, 100) });
            throw new Error(`${fieldName} contains suspicious content`);
        }

        // Sanitize HTML and remove null bytes
        let sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
        sanitized = sanitized.replace(/\0/g, '');

        return sanitized.trim();
    }

    /**
     * Validates and sanitizes email input
     */
    validateAndSanitizeEmail(email: string): string {
        if (!email) {
            throw new Error('Email is required');
        }

        // Basic sanitization
        email = email.trim().toLowerCase();

        // Length validation
        if (email.length > this.config.validation.maxEmailLength) {
            throw new Error(`Email exceeds maximum length of ${this.config.validation.maxEmailLength} characters`);
        }

        // Check for suspicious patterns first
        if (this.containsSuspiciousPatterns(email)) {
            throw new Error('Email contains suspicious content');
        }

        // Email format validation
        if (!validator.isEmail(email)) {
            throw new Error('Invalid email format');
        }

        return email;
    }

    /**
     * Validates UUID format
     */
    validateUUID(id: string, fieldName: string): void {
        if (!id) {
            throw new Error(`${fieldName} is required`);
        }

        if (!validator.isUUID(id, 4)) {
            throw new Error(`Invalid ${fieldName} format`);
        }
    }

    /**
     * Validates JSON input
     */
    validateJSON(jsonString: string, fieldName: string): any {
        if (!jsonString) {
            return null;
        }

        try {
            const parsed = JSON.parse(jsonString);

            // Check for prototype pollution attempts
            if (this.hasPrototypePollution(parsed)) {
                throw new Error(`${fieldName} contains prototype pollution attempt`);
            }

            return parsed;
        } catch (error) {
            throw new Error(`Invalid JSON in ${fieldName}: ${error.message}`);
        }
    }

    /**
     * Encrypts sensitive data
     */
    encryptSensitiveData(data: string): string {
        if (!data) {
            return data;
        }

        const iv = crypto.randomBytes(this.config.encryption.ivLength);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return `${iv.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypts sensitive data
     */
    decryptSensitiveData(encryptedData: string): string {
        if (!encryptedData) {
            return encryptedData;
        }

        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted data format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];

            const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            this.logger.error('Failed to decrypt sensitive data', error);
            throw new Error('Decryption failed');
        }
    }

    /**
     * Generates a secure random token
     */
    generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('base64url');
    }

    /**
     * Creates a secure hash of input data
     */
    createSecureHash(data: string, salt?: string): string {
        const actualSalt = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512');
        return `${actualSalt}:${hash.toString('hex')}`;
    }

    /**
     * Verifies a secure hash
     */
    verifySecureHash(data: string, hash: string): boolean {
        try {
            const [salt, originalHash] = hash.split(':');
            const verifyHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
            return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), verifyHash);
        } catch (error) {
            return false;
        }
    }

    /**
     * Validates IP address
     */
    validateIPAddress(ip: string): boolean {
        return validator.isIP(ip);
    }

    /**
     * Validates user agent string
     */
    validateUserAgent(userAgent: string): string {
        if (!userAgent) {
            return userAgent;
        }

        // Length validation
        if (userAgent.length > 512) {
            throw new Error('User agent string too long');
        }

        // Check for suspicious patterns
        if (this.containsSuspiciousPatterns(userAgent)) {
            throw new Error('User agent contains suspicious content');
        }

        return this.validateAndSanitizeString(userAgent, 'user_agent', 512);
    }

    /**
     * Checks if input contains suspicious patterns
     */
    private containsSuspiciousPatterns(input: string): boolean {
        const suspiciousPatterns = [
            // SQL injection patterns
            /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
            /(\b(script|javascript|vbscript|onload|onerror)\b)/i,
            /(--|\#|\/\*|\*\/)/,
            /(\b(char|ascii|substring)\s*\()/i,

            // XSS patterns
            /<script[^>]*>.*?<\/script>/i,
            /<iframe[^>]*>.*?<\/iframe>/i,
            /<object[^>]*>.*?<\/object>/i,
            /<embed[^>]*>.*?<\/embed>/i,
            /javascript:|vbscript:|data:|about:/i,
            /on\w+\s*=/i,

            // Path traversal patterns
            /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i,
        ];

        return suspiciousPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Checks for prototype pollution attempts
     */
    private hasPrototypePollution(obj: any): boolean {
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }

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
     * Sanitizes object recursively
     */
    sanitizeObject(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip dangerous keys
            if (['__proto__', 'constructor', 'prototype'].includes(key)) {
                continue;
            }

            if (typeof value === 'string') {
                sanitized[key] = this.validateAndSanitizeString(value, key);
            } else if (typeof value === 'object') {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Gets security configuration
     */
    getSecurityConfig(): SecurityConfig {
        return { ...this.config };
    }
}