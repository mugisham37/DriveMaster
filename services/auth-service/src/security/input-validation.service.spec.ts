import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InputValidationService } from './input-validation.service';

describe('InputValidationService', () => {
    let service: InputValidationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [InputValidationService],
        }).compile();

        service = module.get<InputValidationService>(InputValidationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sanitizeHtml', () => {
        it('should remove HTML tags', () => {
            const input = '<p>Hello, <b>World!</b></p>';
            const result = service.sanitizeHtml(input);
            expect(result).toBe('Hello, World!');
        });

        it('should remove script tags', () => {
            const input = '<script>alert("xss")</script>Hello';
            const result = service.sanitizeHtml(input);
            expect(result).toBe('Hello');
        });

        it('should handle empty input', () => {
            const result = service.sanitizeHtml('');
            expect(result).toBe('');
        });

        it('should handle null input', () => {
            const result = service.sanitizeHtml(null);
            expect(result).toBeNull();
        });
    });

    describe('validateAndSanitizeEmail', () => {
        it('should validate and sanitize valid email', () => {
            const email = 'Test@Example.COM';
            const result = service.validateAndSanitizeEmail(email);
            expect(result).toBe('test@example.com');
        });

        it('should throw error for empty email', () => {
            expect(() => service.validateAndSanitizeEmail('')).toThrow(BadRequestException);
            expect(() => service.validateAndSanitizeEmail('')).toThrow('Email is required');
        });

        it('should throw error for invalid email format', () => {
            expect(() => service.validateAndSanitizeEmail('invalid-email')).toThrow(BadRequestException);
            expect(() => service.validateAndSanitizeEmail('invalid-email')).toThrow('Invalid email format');
        });

        it('should throw error for email too long', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            expect(() => service.validateAndSanitizeEmail(longEmail)).toThrow(BadRequestException);
            expect(() => service.validateAndSanitizeEmail(longEmail)).toThrow('Email too long');
        });

        it('should throw error for suspicious content', () => {
            const suspiciousEmail = "test@example.com'; DROP TABLE users; --";
            expect(() => service.validateAndSanitizeEmail(suspiciousEmail)).toThrow(BadRequestException);
            expect(() => service.validateAndSanitizeEmail(suspiciousEmail)).toThrow('invalid content');
        });

        it('should handle whitespace', () => {
            const email = '  test@example.com  ';
            const result = service.validateAndSanitizeEmail(email);
            expect(result).toBe('test@example.com');
        });
    });

    describe('validateAndSanitizeText', () => {
        it('should validate and sanitize normal text', () => {
            const text = 'Hello, World!';
            const result = service.validateAndSanitizeText(text, 100, 'message');
            expect(result).toBe('Hello, World!');
        });

        it('should sanitize HTML in text', () => {
            const text = '<p>Hello, <b>World!</b></p>';
            const result = service.validateAndSanitizeText(text, 100, 'message');
            expect(result).toBe('Hello, World!');
        });

        it('should handle empty text', () => {
            const result = service.validateAndSanitizeText('', 100, 'message');
            expect(result).toBe('');
        });

        it('should throw error for text too long', () => {
            const longText = 'a'.repeat(101);
            expect(() => service.validateAndSanitizeText(longText, 100, 'message')).toThrow(BadRequestException);
            expect(() => service.validateAndSanitizeText(longText, 100, 'message')).toThrow('too long');
        });

        it('should throw error for suspicious patterns', () => {
            const suspiciousText = "Hello'; DROP TABLE users; --";
            expect(() => service.validateAndSanitizeText(suspiciousText, 100, 'message')).toThrow(BadRequestException);
            expect(() => service.validateAndSanitizeText(suspiciousText, 100, 'message')).toThrow('invalid content');
        });

        it('should throw error for control characters', () => {
            const textWithControlChars = 'Hello\x00World';
            expect(() => service.validateAndSanitizeText(textWithControlChars, 100, 'message')).toThrow(BadRequestException);
            expect(() => service.validateAndSanitizeText(textWithControlChars, 100, 'message')).toThrow('invalid characters');
        });

        it('should allow newlines and tabs', () => {
            const textWithNewlines = 'Hello\nWorld\tTest';
            const result = service.validateAndSanitizeText(textWithNewlines, 100, 'message');
            expect(result).toBe('Hello\nWorld\tTest');
        });
    });

    describe('validateUUID', () => {
        it('should validate valid UUID v4', () => {
            const uuid = '550e8400-e29b-41d4-a716-446655440000';
            expect(() => service.validateUUID(uuid, 'id')).not.toThrow();
        });

        it('should validate UUID case insensitive', () => {
            const uuid = '550E8400-E29B-41D4-A716-446655440000';
            expect(() => service.validateUUID(uuid, 'id')).not.toThrow();
        });

        it('should throw error for empty UUID', () => {
            expect(() => service.validateUUID('', 'id')).toThrow(BadRequestException);
            expect(() => service.validateUUID('', 'id')).toThrow('id is required');
        });

        it('should throw error for invalid UUID format', () => {
            expect(() => service.validateUUID('invalid-uuid', 'id')).toThrow(BadRequestException);
            expect(() => service.validateUUID('invalid-uuid', 'id')).toThrow('Invalid id format');
        });

        it('should throw error for wrong UUID version', () => {
            const uuid = '550e8400-e29b-31d4-a716-446655440000'; // version 3
            expect(() => service.validateUUID(uuid, 'id')).toThrow(BadRequestException);
        });
    });

    describe('validateCountryCode', () => {
        it('should validate valid country codes', () => {
            expect(service.validateCountryCode('US')).toBe('US');
            expect(service.validateCountryCode('uk')).toBe('UK');
            expect(service.validateCountryCode('  ca  ')).toBe('CA');
        });

        it('should throw error for empty country code', () => {
            expect(() => service.validateCountryCode('')).toThrow(BadRequestException);
            expect(() => service.validateCountryCode('')).toThrow('Country code is required');
        });

        it('should throw error for invalid length', () => {
            expect(() => service.validateCountryCode('USA')).toThrow(BadRequestException);
            expect(() => service.validateCountryCode('USA')).toThrow('must be 2 characters');
        });

        it('should throw error for non-letters', () => {
            expect(() => service.validateCountryCode('U1')).toThrow(BadRequestException);
            expect(() => service.validateCountryCode('U1')).toThrow('must contain only letters');
        });
    });

    describe('validateLanguageCode', () => {
        it('should validate valid language codes', () => {
            expect(service.validateLanguageCode('en')).toBe('en');
            expect(service.validateLanguageCode('EN-US')).toBe('en-us');
            expect(service.validateLanguageCode('  zh-CN  ')).toBe('zh-cn');
        });

        it('should throw error for empty language code', () => {
            expect(() => service.validateLanguageCode('')).toThrow(BadRequestException);
            expect(() => service.validateLanguageCode('')).toThrow('Language code is required');
        });

        it('should throw error for invalid format', () => {
            expect(() => service.validateLanguageCode('english')).toThrow(BadRequestException);
            expect(() => service.validateLanguageCode('english')).toThrow('Invalid language code format');
        });
    });

    describe('validatePassword', () => {
        it('should validate strong password', () => {
            const password = 'StrongP@ssw0rd!';
            expect(() => service.validatePassword(password)).not.toThrow();
        });

        it('should throw error for empty password', () => {
            expect(() => service.validatePassword('')).toThrow(BadRequestException);
            expect(() => service.validatePassword('')).toThrow('Password is required');
        });

        it('should throw error for password too short', () => {
            expect(() => service.validatePassword('Short1!')).toThrow(BadRequestException);
            expect(() => service.validatePassword('Short1!')).toThrow('at least 8 characters');
        });

        it('should throw error for password too long', () => {
            const longPassword = 'A'.repeat(129) + '1!';
            expect(() => service.validatePassword(longPassword)).toThrow(BadRequestException);
            expect(() => service.validatePassword(longPassword)).toThrow('less than 128 characters');
        });

        it('should throw error for missing lowercase', () => {
            expect(() => service.validatePassword('PASSWORD123!')).toThrow(BadRequestException);
            expect(() => service.validatePassword('PASSWORD123!')).toThrow('lowercase letters');
        });

        it('should throw error for missing uppercase', () => {
            expect(() => service.validatePassword('password123!')).toThrow(BadRequestException);
            expect(() => service.validatePassword('password123!')).toThrow('uppercase letters');
        });

        it('should throw error for missing digits', () => {
            expect(() => service.validatePassword('Password!')).toThrow(BadRequestException);
            expect(() => service.validatePassword('Password!')).toThrow('digits');
        });

        it('should throw error for missing special characters', () => {
            expect(() => service.validatePassword('Password123')).toThrow(BadRequestException);
            expect(() => service.validatePassword('Password123')).toThrow('special characters');
        });

        it('should throw error for common patterns', () => {
            expect(() => service.validatePassword('Password123!')).toThrow(BadRequestException);
            expect(() => service.validatePassword('Password123!')).toThrow('common patterns');
        });
    });

    describe('validateJSON', () => {
        it('should validate valid JSON', () => {
            const json = '{"key": "value", "number": 123}';
            const result = service.validateJSON(json, 'data');
            expect(result).toEqual({ key: 'value', number: 123 });
        });

        it('should return null for empty JSON', () => {
            const result = service.validateJSON('', 'data');
            expect(result).toBeNull();
        });

        it('should throw error for invalid JSON', () => {
            const json = '{"key": invalid}';
            expect(() => service.validateJSON(json, 'data')).toThrow(BadRequestException);
            expect(() => service.validateJSON(json, 'data')).toThrow('Invalid data format');
        });

        it('should throw error for prototype pollution', () => {
            const json = '{"__proto__": {"admin": true}}';
            expect(() => service.validateJSON(json, 'data')).toThrow(BadRequestException);
            expect(() => service.validateJSON(json, 'data')).toThrow('invalid properties');
        });

        it('should throw error for constructor pollution', () => {
            const json = '{"constructor": {"prototype": {"admin": true}}}';
            expect(() => service.validateJSON(json, 'data')).toThrow(BadRequestException);
            expect(() => service.validateJSON(json, 'data')).toThrow('invalid properties');
        });
    });

    describe('validateIPAddress', () => {
        it('should validate IPv4 addresses', () => {
            expect(() => service.validateIPAddress('192.168.1.1')).not.toThrow();
            expect(() => service.validateIPAddress('127.0.0.1')).not.toThrow();
            expect(() => service.validateIPAddress('255.255.255.255')).not.toThrow();
        });

        it('should validate IPv6 addresses', () => {
            expect(() => service.validateIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).not.toThrow();
            expect(() => service.validateIPAddress('::1')).not.toThrow();
        });

        it('should throw error for empty IP', () => {
            expect(() => service.validateIPAddress('')).toThrow(BadRequestException);
            expect(() => service.validateIPAddress('')).toThrow('IP address is required');
        });

        it('should throw error for invalid IP addresses', () => {
            expect(() => service.validateIPAddress('256.256.256.256')).toThrow(BadRequestException);
            expect(() => service.validateIPAddress('invalid-ip')).toThrow(BadRequestException);
        });
    });

    describe('validateUserAgent', () => {
        it('should validate normal user agent', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
            const result = service.validateUserAgent(userAgent);
            expect(result).toBe(userAgent);
        });

        it('should handle empty user agent', () => {
            const result = service.validateUserAgent('');
            expect(result).toBe('');
        });

        it('should throw error for user agent too long', () => {
            const longUserAgent = 'a'.repeat(600);
            expect(() => service.validateUserAgent(longUserAgent)).toThrow(BadRequestException);
            expect(() => service.validateUserAgent(longUserAgent)).toThrow('too long');
        });

        it('should throw error for suspicious user agent', () => {
            const suspiciousUserAgent = 'Mozilla/5.0 <script>alert("xss")</script>';
            expect(() => service.validateUserAgent(suspiciousUserAgent)).toThrow(BadRequestException);
            expect(() => service.validateUserAgent(suspiciousUserAgent)).toThrow('invalid content');
        });
    });
});